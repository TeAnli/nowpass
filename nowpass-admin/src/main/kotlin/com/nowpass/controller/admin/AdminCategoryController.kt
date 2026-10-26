package com.nowpass.controller.admin

import com.nowpass.common.annotation.Log
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.BusinessType
import com.nowpass.common.response.R
import com.nowpass.request.CategoryRequest
import com.nowpass.system.domain.model.QuestionCategory
import com.nowpass.system.service.QuestionCategoryService
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
 * 分类管理（后台）。
 */
@Tag(name = "12. 分类管理", description = "后台分类 CRUD")
@RestController
@RequestMapping("/api/admin/categories")
class AdminCategoryController(
    private val questionCategoryService: QuestionCategoryService,
) {

    @Operation(summary = "分类列表（含题目数量）")
    @PreAuthorize("hasAuthority('${Permissions.CATEGORY_LIST}')")
    @GetMapping
    fun list(): R<List<QuestionCategory>> = R.ok(questionCategoryService.list())

    @Operation(summary = "新增分类")
    @Log(title = "分类管理", businessType = BusinessType.INSERT)
    @PreAuthorize("hasAuthority('${Permissions.CATEGORY_ADD}')")
    @PostMapping
    fun create(@Valid @RequestBody request: CategoryRequest): R<Long> =
        R.ok(questionCategoryService.create(request.name, request.sort))

    @Operation(summary = "编辑分类")
    @Log(title = "分类管理", businessType = BusinessType.UPDATE)
    @PreAuthorize("hasAuthority('${Permissions.CATEGORY_EDIT}')")
    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody request: CategoryRequest): R<Unit> {
        questionCategoryService.update(id, request.name, request.sort)
        return R.ok()
    }

    @Operation(summary = "删除分类", description = "分类下仍有题目时拒绝删除")
    @Log(title = "分类管理", businessType = BusinessType.DELETE)
    @PreAuthorize("hasAuthority('${Permissions.CATEGORY_REMOVE}')")
    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): R<Unit> {
        questionCategoryService.delete(id)
        return R.ok()
    }
}
