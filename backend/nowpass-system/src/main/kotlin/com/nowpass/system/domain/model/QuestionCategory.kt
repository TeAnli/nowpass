package com.nowpass.system.domain.model

/**
 * 题目分类。分类可选归属一个大类。
 */
data class QuestionCategory(
    val id: Long,
    val name: String,
    val icon: String? = null,
    val sort: Int,
    val questionCount: Long = 0,
    val majorCategoryId: Long? = null,
    val majorCategoryName: String? = null,
    val majorCategorySort: Int? = null,
)
