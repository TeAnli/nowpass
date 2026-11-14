package com.nowpass.controller.admin

import com.nowpass.common.annotation.RateLimiter
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.LimitType
import com.nowpass.common.response.R
import com.nowpass.framework.agent.AgentExecuteResponse
import com.nowpass.framework.agent.AgentMessage
import com.nowpass.framework.agent.AgentPendingAction
import com.nowpass.framework.agent.AgentReply
import com.nowpass.framework.agent.AgentService
import com.nowpass.framework.security.SecurityUtils
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

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

/**
 * AI 智能体：用自然语言查询与操作后台数据。
 *
 * 写操作两段式：chat 只产出待确认动作，execute 才真正落库。
 */
@Tag(name = "10. AI 智能体", description = "自然语言查询与维护后台数据")
@RestController
@RequestMapping("/api/admin/agent")
class AdminAgentController(
    private val agentService: AgentService,
) {

    @Operation(summary = "与智能体对话", description = "只读工具直接执行，写操作返回待确认动作")
    @PreAuthorize("hasAuthority('${Permissions.AI_VIEW}')")
    @RateLimiter(key = "agent:chat", time = 60, count = 20, limitType = LimitType.IP_AND_USER)
    @PostMapping("/chat")
    fun chat(@Valid @RequestBody request: AgentChatRequest): R<AgentReply> {
        val current = SecurityUtils.currentUser()
        return R.ok(agentService.chat(request.message, request.history, current.userId, current.username))
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
