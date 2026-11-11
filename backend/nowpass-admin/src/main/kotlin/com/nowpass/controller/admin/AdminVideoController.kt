package com.nowpass.controller.admin

import com.nowpass.common.annotation.Log
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.BusinessType
import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.framework.video.VideoService
import com.nowpass.system.domain.model.VideoAdminItem
import com.nowpass.system.domain.model.VideoCleanupResult
import com.nowpass.system.domain.model.VideoFinalizeCommand
import com.nowpass.system.domain.model.VideoPlayUrl
import com.nowpass.system.domain.model.VideoUploadRequest
import com.nowpass.system.domain.model.VideoUploadTicket
import com.nowpass.system.domain.model.VideoUpsertCommand
import com.nowpass.system.domain.query.VideoPageQuery
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 视频讲解后台管理。
 */
@Tag(name = "13. 视频管理", description = "视频元数据、MinIO 上传、发布与清理")
@RestController
@RequestMapping("/api/admin/videos")
class AdminVideoController(
    private val videoService: VideoService,
) {

    @Operation(summary = "后台视频列表")
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_LIST}')")
    @GetMapping
    fun page(@ModelAttribute query: VideoPageQuery): R<PageResult<VideoAdminItem>> =
        R.ok(videoService.adminPage(query))

    @Operation(summary = "后台视频详情")
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_QUERY}')")
    @GetMapping("/{id}")
    fun detail(@PathVariable id: Long): R<VideoAdminItem> = R.ok(videoService.adminDetail(id))

    @Operation(summary = "新增视频草稿")
    @Log(title = "视频管理", businessType = BusinessType.INSERT)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_ADD}')")
    @PostMapping
    fun create(@Valid @RequestBody command: VideoUpsertCommand): R<Long> = R.ok(videoService.create(command))

    @Operation(summary = "编辑视频元数据")
    @Log(title = "视频管理", businessType = BusinessType.UPDATE)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_EDIT}')")
    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @Valid @RequestBody command: VideoUpsertCommand): R<Unit> {
        videoService.update(id, command)
        return R.ok()
    }

    @Operation(summary = "获取 MinIO 直传地址")
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_EDIT}')")
    @PostMapping("/{id}/upload-url")
    fun uploadUrl(@PathVariable id: Long, @Valid @RequestBody request: VideoUploadRequest): R<VideoUploadTicket> =
        R.ok(videoService.uploadTicket(id, request))

    @Operation(summary = "确认对象已上传")
    @Log(title = "视频管理", businessType = BusinessType.UPDATE)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_EDIT}')")
    @PostMapping("/{id}/finalize")
    fun finalize(@PathVariable id: Long, @Valid @RequestBody command: VideoFinalizeCommand): R<Unit> {
        videoService.finalize(id, command.durationSeconds)
        return R.ok()
    }

    @Operation(summary = "发布视频")
    @Log(title = "视频管理", businessType = BusinessType.UPDATE)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_PUBLISH}')")
    @PostMapping("/{id}/publish")
    fun publish(@PathVariable id: Long): R<Unit> {
        videoService.publish(id)
        return R.ok()
    }

    @Operation(summary = "下线视频")
    @Log(title = "视频管理", businessType = BusinessType.UPDATE)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_PUBLISH}')")
    @PostMapping("/{id}/offline")
    fun offline(@PathVariable id: Long): R<Unit> {
        videoService.offline(id)
        return R.ok()
    }

    @Operation(summary = "草稿预览地址")
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_QUERY}')")
    @GetMapping("/{id}/preview-url")
    fun previewUrl(@PathVariable id: Long): R<VideoPlayUrl> = R.ok(VideoPlayUrl(videoService.previewUrl(id)))

    @Operation(summary = "删除视频（软删除）")
    @Log(title = "视频管理", businessType = BusinessType.DELETE)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_REMOVE}')")
    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): R<Unit> {
        videoService.delete(id)
        return R.ok()
    }

    @Operation(summary = "立即清理草稿与孤儿对象")
    @Log(title = "视频管理", businessType = BusinessType.CLEAN)
    @PreAuthorize("hasAuthority('${Permissions.VIDEO_EDIT}')")
    @PostMapping("/cleanup")
    fun cleanup(): R<VideoCleanupResult> = R.ok(videoService.cleanupNow())
}
