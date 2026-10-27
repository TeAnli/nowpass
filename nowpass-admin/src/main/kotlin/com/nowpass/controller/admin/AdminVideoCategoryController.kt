package com.nowpass.controller.admin

import com.nowpass.common.annotation.Log
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.BusinessType
import com.nowpass.common.response.R
import com.nowpass.framework.video.VideoCategoryService
import com.nowpass.request.VideoCategoryRequest
import com.nowpass.system.domain.model.VideoCategory
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
 * 视频分类后台管理。
 */
@Tag(name = "14. 视频分类管理", description = "独立于题目分类的视频分类 CRUD")
@RestController
@RequestMapping("/api/admin/video-categories")
class AdminVideoCategoryController(
    private val videoCategoryService: VideoCategoryService,
) {

    @Operation(summary = "视频分类列表")
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_CATEGORY_LIST}')")
    @GetMapping
    fun list(): R<List<VideoCategory>> = R.ok(videoCategoryService.list())

    @Operation(summary = "新增视频分类")
    @Log(title = "视频分类", businessType = BusinessType.INSERT)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_CATEGORY_ADD}')")
    @PostMapping
    fun create(@Valid @RequestBody request: VideoCategoryRequest): R<Long> =
        R.ok(videoCategoryService.create(request.name, request.sort))

    @Operation(summary = "编辑视频分类")
    @Log(title = "视频分类", businessType = BusinessType.UPDATE)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_CATEGORY_EDIT}')")
    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody request: VideoCategoryRequest): R<Unit> {
        videoCategoryService.update(id, request.name, request.sort)
        return R.ok()
    }

    @Operation(summary = "删除视频分类", description = "分类下仍有视频时拒绝删除")
    @Log(title = "视频分类", businessType = BusinessType.DELETE)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_CATEGORY_REMOVE}')")
    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): R<Unit> {
        videoCategoryService.delete(id)
        return R.ok()
    }
}
