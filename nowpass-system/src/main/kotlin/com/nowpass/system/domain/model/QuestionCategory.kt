package com.nowpass.system.domain.model

/**
 * 题目分类（单层）。
 */
data class QuestionCategory(
    val id: Long,
    val name: String,
    val sort: Int,
    val questionCount: Long = 0,
)
