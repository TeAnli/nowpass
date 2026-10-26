package com.nowpass.controller

import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.system.domain.model.QuestionAnswer
import com.nowpass.system.domain.model.QuestionCategory
import com.nowpass.system.domain.model.QuestionDetail
import com.nowpass.system.domain.model.QuestionListItem
import com.nowpass.system.domain.query.QuestionPageQuery
import com.nowpass.system.service.QuestionCategoryService
import com.nowpass.system.service.QuestionService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 用户端题库接口：浏览题目、看标准答案。
 *
 * 三个接口刻意分开：
 * - 列表不含题干与答案（不搬运长文本）
 * - 详情含题干与选项，**不含答案**
 * - 答案单独一个接口，便于将来加查看统计或进一步收权限
 */
@Tag(name = "02. 题库（用户端）", description = "题目列表、题目详情、标准答案、分类")
@RestController
@RequestMapping("/api")
class CatalogController(
    private val questionService: QuestionService,
    private val questionCategoryService: QuestionCategoryService,
) {

    @Operation(summary = "题目分页列表", description = "支持分类、难度、标签、标题关键词筛选；不含题干与答案")
    @GetMapping("/questions")
    fun page(query: QuestionPageQuery): R<PageResult<QuestionListItem>> =
        R.ok(questionService.page(query))

    @Operation(summary = "题目详情", description = "含题干与选项，不含标准答案")
    @GetMapping("/questions/{id}")
    fun detail(@PathVariable id: Long): R<QuestionDetail> =
        R.ok(questionService.detailAndCountView(id))

    @Operation(summary = "查看标准答案", description = "独立接口，便于统计与后续收权限")
    @GetMapping("/questions/{id}/answer")
    fun answer(@PathVariable id: Long): R<QuestionAnswer> =
        R.ok(questionService.answer(id))

    @Operation(summary = "分类列表", description = "含每个分类下的题目数量")
    @GetMapping("/categories")
    fun categories(): R<List<QuestionCategory>> =
        R.ok(questionCategoryService.list())
}
