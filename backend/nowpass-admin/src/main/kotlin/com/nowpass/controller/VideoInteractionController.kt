package com.nowpass.controller

import com.nowpass.common.annotation.RateLimiter
import com.nowpass.common.enums.LimitType
import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.framework.security.RolePermissions
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.framework.video.VideoInteractionService
import com.nowpass.system.domain.model.VideoCommentCommand
import com.nowpass.system.domain.model.VideoCommentItem
import com.nowpass.system.domain.model.VideoDanmakuCommand
import com.nowpass.system.domain.model.VideoDanmakuItem
import com.nowpass.system.domain.query.VideoCommentPageQuery
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 视频互动接口：评论与时间点弹幕。
 */
@Tag(name = "04. 视频互动", description = "视频评论、删除评论与时间点弹幕")
@RestController
@RequestMapping("/api/videos")
class VideoInteractionController(
    private val videoInteractionService: VideoInteractionService,
) {

    @Operation(summary = "视频评论分页")
    @GetMapping("/{id}/comments")
    fun comments(
        @PathVariable id: Long,
        @ModelAttribute query: VideoCommentPageQuery,
    ): R<PageResult<VideoCommentItem>> =
        R.ok(videoInteractionService.commentPage(id, query))

    @Operation(summary = "发表评论")
    @RateLimiter(key = "video:comment", time = 60, count = 8, limitType = LimitType.IP_AND_USER)
    @PostMapping("/{id}/comments")
    fun addComment(
        @PathVariable id: Long,
        @Valid @RequestBody command: VideoCommentCommand,
    ): R<VideoCommentItem> {
        val currentUser = SecurityUtils.currentUser()
        return R.ok(videoInteractionService.addComment(id, currentUser.userId, command))
    }

    @Operation(summary = "删除评论", description = "本人或管理员可删除")
    @DeleteMapping("/{id}/comments/{commentId}")
    fun deleteComment(
        @PathVariable id: Long,
        @PathVariable commentId: Long,
    ): R<Unit> {
        val currentUser = SecurityUtils.currentUser()
        val moderator = currentUser.roles.any {
            it.equals(RolePermissions.ROLE_ADMIN, true) || it.equals(RolePermissions.ROLE_SUPER_ADMIN, true)
        }
        videoInteractionService.deleteComment(id, commentId, currentUser.userId, moderator)
        return R.ok()
    }

    @Operation(summary = "视频弹幕列表")
    @GetMapping("/{id}/danmaku")
    fun danmaku(@PathVariable id: Long): R<List<VideoDanmakuItem>> =
        R.ok(videoInteractionService.danmaku(id))

    @Operation(summary = "发送弹幕")
    @RateLimiter(key = "video:danmaku", time = 60, count = 20, limitType = LimitType.IP_AND_USER)
    @PostMapping("/{id}/danmaku")
    fun addDanmaku(
        @PathVariable id: Long,
        @Valid @RequestBody command: VideoDanmakuCommand,
    ): R<VideoDanmakuItem> {
        val currentUser = SecurityUtils.currentUser()
        return R.ok(videoInteractionService.addDanmaku(id, currentUser.userId, command))
    }
}
