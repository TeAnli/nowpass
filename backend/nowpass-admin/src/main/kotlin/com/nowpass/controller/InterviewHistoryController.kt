package com.nowpass.controller

import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.framework.learning.LearningService
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.system.domain.model.InterviewFinishCommand
import com.nowpass.system.domain.model.InterviewSessionCreate
import com.nowpass.system.domain.model.InterviewSessionDetail
import com.nowpass.system.domain.model.InterviewSessionItem
import com.nowpass.system.domain.model.InterviewTurnAppend
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * AI 面试历史：场次、对话与点评的持久化。
 */
@Tag(name = "07. 面试历史", description = "AI 面试场次创建、追加对话、结束与回看")
@RestController
@RequestMapping("/api/interview/sessions")
class InterviewHistoryController(
    private val learningService: LearningService,
) {

    @Operation(summary = "创建面试场次")
    @PostMapping
    fun create(@Valid @RequestBody command: InterviewSessionCreate): R<Long> =
        R.ok(learningService.createSession(SecurityUtils.currentUserId(), command))

    @Operation(summary = "追加一轮对话", description = "同时保存候选人问题与面试官回复")
    @PostMapping("/{id}/turns")
    fun appendTurn(
        @PathVariable id: Long,
        @Valid @RequestBody turn: InterviewTurnAppend,
    ): R<Unit> {
        learningService.appendTurn(SecurityUtils.currentUserId(), id, turn)
        return R.ok()
    }

    @Operation(summary = "结束场次并保存点评")
    @PostMapping("/{id}/finish")
    fun finish(
        @PathVariable id: Long,
        @RequestBody command: InterviewFinishCommand,
    ): R<Unit> {
        learningService.finishSession(SecurityUtils.currentUserId(), id, command)
        return R.ok()
    }

    @Operation(summary = "我的面试历史")
    @GetMapping
    fun page(
        @RequestParam(defaultValue = "1") @Min(1) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) pageSize: Int,
    ): R<PageResult<InterviewSessionItem>> =
        R.ok(learningService.sessionPage(SecurityUtils.currentUserId(), page, pageSize))

    @Operation(summary = "面试详情", description = "含完整对话与点评")
    @GetMapping("/{id}")
    fun detail(@PathVariable id: Long): R<InterviewSessionDetail> =
        R.ok(learningService.sessionDetail(SecurityUtils.currentUserId(), id))
}
