package com.nowpass.system.domain.model

import kotlinx.serialization.Serializable

/**
 * 选择题选项，存放在 `question.options`（jsonb 数组）中。
 *
 * 必须 `@Serializable`：Exposed 的 `jsonb<T>()` 走 kotlinx-serialization。
 */
@Serializable
data class QuestionOption(
    val key: String,
    val text: String,
)
