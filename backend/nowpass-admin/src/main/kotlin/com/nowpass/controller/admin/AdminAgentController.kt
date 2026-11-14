package com.nowpass.controller.admin

import com.fasterxml.jackson.databind.ObjectMapper
import com.nowpass.common.annotation.RateLimiter
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.LimitType
import com.nowpass.common.response.R
import com.nowpass.framework.agent.AgentExecuteResponse
import com.nowpass.framework.agent.AgentMessage
import com.nowpass.framework.agent.AgentPendingAction
import com.nowpass.framework.agent.AgentReply
import com.nowpass.framework.agent.AgentRunSnapshot
import com.nowpass.framework.agent.AgentService
import com.nowpass.framework.security.SecurityUtils
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.core.task.TaskExecutor
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter

data class AgentChatRequest(
    @field:NotBlank(message = "请输入指令")
    @field:Size(max = 2000, message = "指令不能超过 2000 字")
    val message: String,

    @field:Size(max = 8, message = "历史消息不能超过 8 条")
    val history: List<AgentMessage> = emptyList(),
)

data class AgentExecuteRequest(
    @field:Size(max = 5, message = "一次最多执行 5 个动作")
    val actions: List<AgentPendingAction> = emptyList(),
)

data class AgentRunStarted(val runId: String)

private const val STREAM_TIMEOUT_MS = 180_000L

/**
 * AI 智能体：用自然语言查询与操作后台数据。
 *
 * 采用「提交任务 + 轮询进度」两段式：`runs` 立即返回 runId，
 * 前端轮询 `runs/{id}` 实时渲染思考过程，最后再展示结论卡。
 * 写操作仍是待确认动作，`execute` 才真正落库。
 */
@Tag(name = "10. AI 智能体", description = "自然语言查询与维护后台数据")
@RestController
@RequestMapping("/api/admin/agent")
class AdminAgentController(
    private val agentService: AgentService,
    private val objectMapper: ObjectMapper,
    @Qualifier("applicationTaskExecutor") private val taskExecutor: TaskExecutor,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Operation(summary = "提交智能体任务", description = "立即返回 runId，思考过程通过轮询获取")
    @PreAuthorize("hasAuthority('${Permissions.AI_VIEW}')")
    @RateLimiter(key = "agent:run", time = 60, count = 20, limitType = LimitType.IP_AND_USER)
    @PostMapping("/runs")
    fun startRun(@Valid @RequestBody request: AgentChatRequest): R<AgentRunStarted> {
        val current = SecurityUtils.currentUser()
        val runId = agentService.startRun(request.message, request.history, current.userId, current.username)
        return R.ok(AgentRunStarted(runId))
    }

    @Operation(summary = "查询任务进度", description = "返回状态、思考步骤、表格、待确认动作与最终结论")
    @PreAuthorize("hasAuthority('${Permissions.AI_VIEW}')")
    @GetMapping("/runs/{id}")
    fun runSnapshot(@PathVariable id: String): R<AgentRunSnapshot> =
        R.ok(agentService.runSnapshot(id, SecurityUtils.currentUserId()))

    @Operation(summary = "同步对话", description = "一次性返回完整结果，供脚本或调试使用")
    @PreAuthorize("hasAuthority('${Permissions.AI_VIEW}')")
    @RateLimiter(key = "agent:chat", time = 60, count = 20, limitType = LimitType.IP_AND_USER)
    @PostMapping("/chat")
    fun chat(@Valid @RequestBody request: AgentChatRequest): R<AgentReply> {
        val current = SecurityUtils.currentUser()
        return R.ok(agentService.chat(request.message, request.history, current.userId, current.username))
    }

    @Operation(summary = "流式对话", description = "SSE 逐步推送思考过程；写操作仍返回待确认动作")
    @PreAuthorize("hasAuthority('${Permissions.AI_VIEW}')")
    @RateLimiter(key = "agent:stream", time = 60, count = 20, limitType = LimitType.IP_AND_USER)
    @PostMapping("/stream", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
    fun stream(@Valid @RequestBody request: AgentChatRequest): ResponseEntity<SseEmitter> {
        val current = SecurityUtils.currentUser()
        val emitter = SseEmitter(STREAM_TIMEOUT_MS)
        emitter.onTimeout { runCatching { emitter.complete() } }
        emitter.onError { runCatching { emitter.complete() } }

        taskExecutor.execute {
            try {
                // 先发一个注释包，让代理立刻进入流式转发，避免首包被缓冲
                emitter.send(SseEmitter.event().comment("open"))
                agentService.chatStreaming(request.message, request.history, current.userId, current.username) { event, data ->
                    val json = objectMapper.writeValueAsString(data)
                    log.debug("SSE emit event={} bytes={}", event, json.length)
                    emitter.send(SseEmitter.event().name(event).data(json, MediaType.APPLICATION_JSON))
                }
                emitter.complete()
            } catch (exception: Exception) {
                log.warn("SSE 推送失败：{}", exception.javaClass.simpleName)
                runCatching { emitter.completeWithError(exception) }
            }
        }

        return ResponseEntity.ok()
            .contentType(MediaType.TEXT_EVENT_STREAM)
            .header("X-Accel-Buffering", "no")
            .header("Cache-Control", "no-cache, no-transform")
            .body(emitter)
    }

    @Operation(summary = "执行待确认动作", description = "需要 ai:edit 权限，逐条执行并写审计日志")
    @PreAuthorize("hasAuthority('${Permissions.AI_EDIT}')")
    @RateLimiter(key = "agent:execute", time = 60, count = 20, limitType = LimitType.IP_AND_USER)
    @PostMapping("/execute")
    fun execute(@Valid @RequestBody request: AgentExecuteRequest): R<AgentExecuteResponse> {
        val current = SecurityUtils.currentUser()
        return R.ok(agentService.execute(request.actions, current.userId, current.username))
    }
}
