package com.nowpass.controller.admin

import com.nowpass.common.annotation.Log
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.BusinessType
import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.system.domain.model.QuestionAnswer
import com.nowpass.system.domain.model.QuestionDetail
import com.nowpass.system.domain.model.QuestionListItem
import com.nowpass.system.domain.model.QuestionUpsertCommand
import com.nowpass.system.domain.query.QuestionPageQuery
import com.nowpass.system.service.QuestionService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 题目管理（后台）。
 */
@Tag(name = "11. 题目管理", description = "后台题目 CRUD（含答案）")
@RestController
@RequestMapping("/api/admin/questions")
class AdminQuestionController(
    private val questionService: QuestionService,
) {

    @Operation(summary = "题目分页列表")
    @PreAuthorize("hasAuthority('${Permissions.QUESTION_LIST}')")
    @GetMapping
    fun page(query: QuestionPageQuery): R<PageResult<QuestionListItem>> =
        R.ok(questionService.page(query))

    @Operation(summary = "题目详情（不含答案）")
    @PreAuthorize("hasAuthority('${Permissions.QUESTION_QUERY}')")
    @GetMapping("/{id}")
    fun detail(@PathVariable id: Long): R<QuestionDetail> = R.ok(questionService.detail(id))

    @Operation(summary = "查看标准答案")
    @PreAuthorize("hasAuthority('${Permissions.QUESTION_QUERY}')")
    @GetMapping("/{id}/answer")
    fun answer(@PathVariable id: Long): R<QuestionAnswer> = R.ok(questionService.answer(id))

    @Operation(summary = "新增题目")
    @Log(title = "题目管理", businessType = BusinessType.INSERT)
    @PreAuthorize("hasAuthority('${Permissions.QUESTION_ADD}')")
    @PostMapping
    fun create(@Valid @RequestBody command: QuestionUpsertCommand): R<Long> =
        R.ok(questionService.create(command, SecurityUtils.currentUsername()))

    @Operation(summary = "编辑题目")
    @Log(title = "题目管理", businessType = BusinessType.UPDATE)
    @PreAuthorize("hasAuthority('${Permissions.QUESTION_EDIT}')")
    @PutMapping("/{id}")
    fun update(
        @PathVariable id: Long,
        @Valid @RequestBody command: QuestionUpsertCommand,
    ): R<Unit> {
        questionService.update(id, command, SecurityUtils.currentUsername())
        return R.ok()
    }

    @Operation(summary = "删除题目（逻辑删除）")
    @Log(title = "题目管理", businessType = BusinessType.DELETE)
    @PreAuthorize("hasAuthority('${Permissions.QUESTION_REMOVE}')")
    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): R<Unit> {
        questionService.delete(id, SecurityUtils.currentUsername())
        return R.ok()
    }
}
