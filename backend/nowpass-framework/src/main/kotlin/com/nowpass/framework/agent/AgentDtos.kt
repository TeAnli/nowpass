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

/** 一次工具调用，用于前端展开查看思考链。 */
data class AgentStep(
    val index: Int,
    val round: Int,
    val tool: String,
    val write: Boolean,
    val args: String,
    val result: String,
    val durationMs: Int,
    val success: Boolean = true,
)

/** 结构化表格，前端用表格组件渲染，不走 Markdown。 */
data class AgentTable(
    val title: String,
    val columns: List<String>,
    val rows: List<List<String>>,
)

data class AgentReply(
    val reply: String,
    val provider: String,
    val pendingActions: List<AgentPendingAction> = emptyList(),
    val steps: List<AgentStep> = emptyList(),
    val tables: List<AgentTable> = emptyList(),
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
