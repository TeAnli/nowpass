package com.nowpass.framework.agent

import com.nowpass.system.domain.model.QuestionOption

data class AgentMessage(
    val role: String,
    val content: String,
)

data class AgentPendingAction(
    val tool: String,
    val title: String,
    val summary: String,
    val args: Map<String, Any?> = emptyMap(),
)

data class AgentReply(
    val reply: String,
    val provider: String,
    val pendingActions: List<AgentPendingAction> = emptyList(),
)

data class AgentExecuteResult(
    val tool: String,
    val success: Boolean,
    val message: String,
)

data class AgentExecuteResponse(
    val results: List<AgentExecuteResult>,
)

/** 智能体创建题目时的入参，最终映射为 QuestionUpsertCommand。 */
data class AgentQuestionDraft(
    val title: String,
    val contentMd: String,
    val answerMd: String,
    val categoryName: String?,
    val categoryId: Long?,
    val difficulty: String,
    val tags: List<String>,
    val options: List<QuestionOption>?,
)
