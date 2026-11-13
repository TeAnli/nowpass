package com.nowpass.framework.learning

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.dao.InterviewHistoryDao
import com.nowpass.system.domain.dao.LearningDao
import com.nowpass.system.domain.model.FavoriteItem
import com.nowpass.system.domain.model.InterviewFinishCommand
import com.nowpass.system.domain.model.InterviewMessageAppend
import com.nowpass.system.domain.model.InterviewSessionCreate
import com.nowpass.system.domain.model.InterviewSessionDetail
import com.nowpass.system.domain.model.InterviewSessionItem
import com.nowpass.system.domain.model.InterviewTurnAppend
import com.nowpass.system.domain.model.LearningSummary
import com.nowpass.system.domain.model.ProgressCommand
import com.nowpass.system.domain.model.ProgressItem
import com.nowpass.system.service.QuestionService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 用户学习数据：收藏、刷题记录、AI 面试历史。
 */
@Service
@Transactional
class LearningService(
    private val learningDao: LearningDao,
    private val interviewHistoryDao: InterviewHistoryDao,
    private val questionService: QuestionService,
) {

    // ---------------- 收藏 ----------------

    @Transactional(readOnly = true)
    fun favoritePage(userId: Long, page: Int, pageSize: Int): PageResult<FavoriteItem> =
        learningDao.favoritePage(userId, (page - 1).toLong() * pageSize, pageSize)

    fun addFavorite(userId: Long, questionId: Long) {
        questionService.detail(questionId)
        if (!learningDao.isFavorite(userId, questionId)) {
            learningDao.addFavorite(userId, questionId)
        }
    }

    fun removeFavorite(userId: Long, questionId: Long) {
        learningDao.removeFavorite(userId, questionId)
    }

    @Transactional(readOnly = true)
    fun isFavorite(userId: Long, questionId: Long): Boolean = learningDao.isFavorite(userId, questionId)

    // ---------------- 刷题记录 ----------------

    fun recordProgress(userId: Long, questionId: Long, command: ProgressCommand) {
        val rating = command.selfRating?.trim()?.lowercase()
        if (rating != null && rating !in RATINGS) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "掌握度只能是 known、unsure 或 unknown")
        }
        questionService.detail(questionId)
        learningDao.touchProgress(userId, questionId, command.answerRevealed, rating)
    }

    @Transactional(readOnly = true)
    fun progressPage(userId: Long, page: Int, pageSize: Int): PageResult<ProgressItem> =
        learningDao.progressPage(userId, (page - 1).toLong() * pageSize, pageSize)

    @Transactional(readOnly = true)
    fun summary(userId: Long): LearningSummary {
        val base = learningDao.summary(userId)
        return base.copy(interviewCount = interviewHistoryDao.countByUser(userId))
    }

    // ---------------- 面试历史 ----------------

    fun createSession(userId: Long, command: InterviewSessionCreate): Long {
        if (command.questionId <= 0) throw ServiceException(ErrorCode.BAD_REQUEST, "请选择题目")
        return interviewHistoryDao.createSession(userId, command)
    }

    fun appendTurn(userId: Long, sessionId: Long, turn: InterviewTurnAppend) {
        requireOwnership(sessionId, userId)
        turn.userContent?.trim()?.takeIf { it.isNotEmpty() }?.let {
            interviewHistoryDao.appendMessage(sessionId, InterviewMessageAppend("user", it))
        }
        interviewHistoryDao.appendMessage(sessionId, InterviewMessageAppend("assistant", turn.assistantContent))
        val provider = turn.provider
        if (!provider.isNullOrBlank()) {
            interviewHistoryDao.updateProvider(sessionId, userId, provider)
        }
    }

    fun finishSession(userId: Long, sessionId: Long, command: InterviewFinishCommand) {
        requireOwnership(sessionId, userId)
        interviewHistoryDao.finishSession(sessionId, userId, command.reportMd)
    }

    @Transactional(readOnly = true)
    fun sessionPage(userId: Long, page: Int, pageSize: Int): PageResult<InterviewSessionItem> =
        interviewHistoryDao.page(userId, (page - 1).toLong() * pageSize, pageSize)

    @Transactional(readOnly = true)
    fun sessionDetail(userId: Long, sessionId: Long): InterviewSessionDetail =
        interviewHistoryDao.detail(sessionId, userId)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "面试记录不存在")

    private fun requireOwnership(sessionId: Long, userId: Long) {
        interviewHistoryDao.detail(sessionId, userId)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "面试记录不存在")
    }

    companion object {
        private val RATINGS = setOf("known", "unsure", "unknown")
    }
}
