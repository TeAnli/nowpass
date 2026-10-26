package com.nowpass.system.domain.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime

/**
 * 题目完整领域模型（仅服务端内部使用，含答案）。
 */
data class Question(
    val id: Long,
    val categoryId: Long,
    val categoryName: String?,
    val difficulty: String,
    val title: String,
    val contentMd: String,
    val answerMd: String,
    val options: List<QuestionOption>?,
    val answerKey: String?,
    val tags: List<String>,
    val createBy: String?,
    val createTime: OffsetDateTime?,
    val updateTime: OffsetDateTime?,
)

/**
 * 列表项：**刻意不含 contentMd / answerMd**，避免列表页搬运长文本。
 */
data class QuestionListItem(
    val id: Long,
    val categoryId: Long,
    val categoryName: String?,
    val difficulty: String,
    val title: String,
    val tags: List<String>,
    val createTime: OffsetDateTime?,
)

/**
 * 详情：含题干与选项，**不含标准答案**。答案走独立接口。
 */
data class QuestionDetail(
    val id: Long,
    val categoryId: Long,
    val categoryName: String?,
    val difficulty: String,
    val title: String,
    val contentMd: String,
    val options: List<QuestionOption>?,
    val tags: List<String>,
    val createTime: OffsetDateTime?,
)

/**
 * 标准答案。独立接口返回，便于将来加「查看次数」统计与权限细分。
 */
data class QuestionAnswer(
    val id: Long,
    val answerMd: String,
    val answerKey: String?,
)

/**
 * 新增 / 编辑题目的入参。
 */
data class QuestionUpsertCommand(
    @field:NotNull(message = "分类不能为空")
    val categoryId: Long?,

    @field:NotBlank(message = "难度不能为空")
    val difficulty: String,

    @field:NotBlank(message = "标题不能为空")
    @field:Size(max = 200, message = "标题不能超过 200 字")
    val title: String,

    @field:NotBlank(message = "题干不能为空")
    val contentMd: String,

    @field:NotBlank(message = "标准答案不能为空")
    val answerMd: String,

    val options: List<QuestionOption>? = null,
    val answerKey: String? = null,
    val tags: List<String> = emptyList(),
)
