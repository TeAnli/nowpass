package com.nowpass.framework.interview

import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class InterviewMessage(
    @field:NotBlank(message = "消息角色不能为空")
    val role: String,

    @field:NotBlank(message = "消息内容不能为空")
    @field:Size(max = 4000, message = "单条消息不能超过 4000 字")
    val content: String,
)

data class InterviewChatRequest(
    @field:NotNull(message = "请选择一个面试题")
    val questionId: Long?,

    @field:Size(max = 20, message = "对话历史不能超过 20 条")
    val history: List<@Valid InterviewMessage> = emptyList(),

    @field:Pattern(regexp = "chat|hint|review", message = "不支持的面试操作")
    val action: String = "chat",
)

data class InterviewStatusResponse(
    val configured: Boolean,
    val model: String?,
    val provider: String,
)

data class InterviewChatResponse(
    val reply: String,
    val provider: String,
    val questionId: Long,
)
