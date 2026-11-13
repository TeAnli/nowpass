package com.nowpass.controller

import com.nowpass.common.annotation.RateLimiter
import com.nowpass.common.enums.LimitType
import com.nowpass.common.response.R
import com.nowpass.framework.interview.AiInterviewService
import com.nowpass.framework.interview.InterviewChatRequest
import com.nowpass.framework.interview.InterviewChatResponse
import com.nowpass.framework.interview.InterviewStatusResponse
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.framework.tts.AliyunTtsService
import com.nowpass.framework.tts.InterviewTtsRequest
import com.nowpass.framework.tts.InterviewTtsStatusResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * AI 面试官对话入口。登录后可用，不要求额外权限点。
 */
@Tag(name = "03. AI 面试官", description = "基于题目上下文的模拟面试对话")
@RestController
@RequestMapping("/api/interview")
class InterviewController(
    private val aiInterviewService: AiInterviewService,
    private val aliyunTtsService: AliyunTtsService,
) {

    @GetMapping("/status")
    @Operation(summary = "获取面试模型配置状态（不包含密钥）")
    fun status(): R<InterviewStatusResponse> = R.ok(aiInterviewService.status())

    @Operation(summary = "发送面试对话", description = "携带题目 id 与最近对话历史，返回面试官回复")
    @PostMapping("/chat")
    fun chat(@Valid @RequestBody request: InterviewChatRequest): R<InterviewChatResponse> =
        R.ok(
            aiInterviewService.chat(
                request.questionId!!,
                request.history,
                request.action,
                SecurityUtils.currentUserId(),
            ),
        )

    @GetMapping("/tts/status")
    @Operation(summary = "获取面试官语音合成状态（不包含密钥）")
    fun ttsStatus(): R<InterviewTtsStatusResponse> = R.ok(aliyunTtsService.status())

    @Operation(summary = "合成面试官语音", description = "返回 audio/mpeg；单次最多 300 字")
    @RateLimiter(key = "interview:tts", time = 60, count = 20, limitType = LimitType.IP_AND_USER)
    @PostMapping("/tts")
    fun tts(@Valid @RequestBody request: InterviewTtsRequest): ResponseEntity<ByteArray> =
        ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("audio/mpeg"))
            .header("Cache-Control", "no-store")
            .body(aliyunTtsService.synthesize(request.text))
}
