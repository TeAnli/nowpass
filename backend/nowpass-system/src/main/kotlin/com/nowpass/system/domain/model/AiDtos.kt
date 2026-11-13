package com.nowpass.system.domain.model

import java.time.OffsetDateTime

data class AiPrompt(
    val key: String,
    val name: String,
    val content: String,
    val description: String?,
    val updateTime: OffsetDateTime,
)

data class AiUsageItem(
    val id: Long,
    val scene: String,
    val provider: String?,
    val userId: Long?,
    val success: Boolean,
    val promptChars: Int,
    val replyChars: Int,
    val latencyMs: Int,
    val createTime: OffsetDateTime,
)

data class AiUsageSummary(
    val totalCalls: Long,
    val interviewCalls: Long,
    val supportCalls: Long,
    val failedCalls: Long,
    val avgLatencyMs: Long,
)

data class AiOverview(
    val interviewProvider: String,
    val interviewModel: String?,
    val interviewConfigured: Boolean,
    val ttsEnabled: Boolean,
    val ttsVoice: String,
    val ttsProvider: String,
    val usage: AiUsageSummary,
)

data class AiPromptUpdate(
    val content: String,
)

data class AiUsageRecord(
    val scene: String,
    val provider: String?,
    val userId: Long?,
    val success: Boolean,
    val promptChars: Int,
    val replyChars: Int,
    val latencyMs: Int,
)
