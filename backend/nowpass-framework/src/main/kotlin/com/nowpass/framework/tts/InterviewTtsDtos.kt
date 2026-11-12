package com.nowpass.framework.tts

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class InterviewTtsStatusResponse(
    val enabled: Boolean,
    val provider: String = "aliyun",
    val voice: String,
    val maxChars: Int,
)

data class InterviewTtsRequest(
    @field:NotBlank(message = "朗读文本不能为空")
    @field:Size(max = 300, message = "单次朗读不能超过 300 字")
    val text: String,
)
