package com.nowpass.controller

import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.framework.learning.LearningService
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.system.domain.model.FavoriteCommand
import com.nowpass.system.domain.model.FavoriteItem
import com.nowpass.system.domain.model.FavoriteState
import com.nowpass.system.domain.model.LearningSummary
import com.nowpass.system.domain.model.ProgressCommand
import com.nowpass.system.domain.model.ProgressItem
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 学习数据：收藏与刷题记录。仅操作当前登录用户自己的数据。
 */
@Tag(name = "06. 学习数据", description = "题目收藏、刷题记录与学习概览")
@RestController
@RequestMapping("/api/user")
class LearningController(
    private val learningService: LearningService,
) {

    @Operation(summary = "收藏列表")
    @GetMapping("/favorites")
    fun favorites(
        @RequestParam(defaultValue = "1") @Min(1) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) pageSize: Int,
    ): R<PageResult<FavoriteItem>> =
        R.ok(learningService.favoritePage(SecurityUtils.currentUserId(), page, pageSize))

    @Operation(summary = "是否已收藏")
    @GetMapping("/favorites/{questionId}")
    fun favoriteState(@PathVariable questionId: Long): R<FavoriteState> {
        val userId = SecurityUtils.currentUserId()
        return R.ok(FavoriteState(questionId, learningService.isFavorite(userId, questionId)))
    }

    @Operation(summary = "收藏题目")
    @PostMapping("/favorites")
    fun addFavorite(@Valid @RequestBody command: FavoriteCommand): R<Unit> {
        learningService.addFavorite(SecurityUtils.currentUserId(), command.questionId)
        return R.ok()
    }

    @Operation(summary = "取消收藏")
    @DeleteMapping("/favorites/{questionId}")
    fun removeFavorite(@PathVariable questionId: Long): R<Unit> {
        learningService.removeFavorite(SecurityUtils.currentUserId(), questionId)
        return R.ok()
    }

    @Operation(summary = "记录刷题行为", description = "打开题目或揭晓答案时调用，可附带自评掌握度")
    @PostMapping("/progress/{questionId}")
    fun recordProgress(
        @PathVariable questionId: Long,
        @RequestBody command: ProgressCommand,
    ): R<Unit> {
        learningService.recordProgress(SecurityUtils.currentUserId(), questionId, command)
        return R.ok()
    }

    @Operation(summary = "刷题记录列表")
    @GetMapping("/progress")
    fun progress(
        @RequestParam(defaultValue = "1") @Min(1) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) pageSize: Int,
    ): R<PageResult<ProgressItem>> =
        R.ok(learningService.progressPage(SecurityUtils.currentUserId(), page, pageSize))

    @Operation(summary = "学习概览", description = "收藏数、已读题数、掌握度分布、面试场次")
    @GetMapping("/learning/summary")
    fun summary(): R<LearningSummary> =
        R.ok(learningService.summary(SecurityUtils.currentUserId()))
}
