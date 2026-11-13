package com.nowpass.controller

import com.nowpass.common.annotation.RateLimiter
import com.nowpass.common.enums.LimitType
import com.nowpass.common.response.R
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.framework.support.SupportMessage
import com.nowpass.framework.support.SupportReply
import com.nowpass.framework.support.SupportService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

data class SupportChatRequest(
    @field:NotBlank(message = "请输入问题")
    @field:Size(max = 500, message = "问题不能超过 500 字")
    val message: String,

    @field:Size(max = 8, message = "历史消息不能超过 8 条")
    val history: List<SupportMessage> = emptyList(),
)

/**
 * AI 客服入口。登录后可用，按用户限流。
 */
@Tag(name = "08. AI 客服", description = "站点使用问题的智能问答")
@RestController
@RequestMapping("/api/support")
class SupportController(
    private val supportService: SupportService,
) {

    @Operation(summary = "咨询站点问题")
    @RateLimiter(key = "support:chat", time = 60, count = 10, limitType = LimitType.IP_AND_USER)
    @PostMapping("/chat")
    fun chat(@Valid @RequestBody request: SupportChatRequest): R<SupportReply> =
        R.ok(supportService.chat(request.message, request.history, SecurityUtils.currentUserId()))
}
