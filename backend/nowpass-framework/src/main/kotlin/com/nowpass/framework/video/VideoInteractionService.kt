package com.nowpass.framework.video

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.dao.VideoCommentDao
import com.nowpass.system.domain.dao.VideoDanmakuDao
import com.nowpass.system.domain.dao.VideoDao
import com.nowpass.system.domain.model.VideoCommentCommand
import com.nowpass.system.domain.model.VideoCommentItem
import com.nowpass.system.domain.model.VideoDanmakuCommand
import com.nowpass.system.domain.model.VideoDanmakuItem
import com.nowpass.system.domain.query.VideoCommentPageQuery
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 视频互动：评论与时间点弹幕。
 *
 * 只允许对已发布视频互动；评论删除权限为本人或管理员。
 */
@Service
@Transactional
class VideoInteractionService(
    private val videoDao: VideoDao,
    private val commentDao: VideoCommentDao,
    private val danmakuDao: VideoDanmakuDao,
) {

    @Transactional(readOnly = true)
    fun commentPage(videoId: Long, query: VideoCommentPageQuery): PageResult<VideoCommentItem> {
        ensurePublished(videoId)
        query.pageSize = query.pageSize.coerceAtMost(MAX_COMMENT_PAGE_SIZE)
        return commentDao.page(videoId, query)
    }

    fun addComment(videoId: Long, userId: Long, command: VideoCommentCommand): VideoCommentItem {
        ensurePublished(videoId)
        val content = command.content.trim()
        if (content.isEmpty()) throw ServiceException(ErrorCode.BAD_REQUEST, "评论不能为空")
        val id = commentDao.insert(videoId, userId, content)
        return commentDao.findById(id)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "评论创建失败")
    }

    fun deleteComment(videoId: Long, commentId: Long, currentUserId: Long, moderator: Boolean) {
        ensurePublished(videoId)
        val owner = commentDao.findOwner(commentId)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "评论不存在")
        if (owner.videoId != videoId) throw ServiceException(ErrorCode.NOT_FOUND, "评论不属于该视频")
        if (!moderator && owner.userId != currentUserId) {
            throw ServiceException(ErrorCode.FORBIDDEN, "只能删除自己的评论")
        }
        if (commentDao.softDelete(commentId) == 0) {
            throw ServiceException(ErrorCode.NOT_FOUND, "评论不存在")
        }
    }

    @Transactional(readOnly = true)
    fun danmaku(videoId: Long): List<VideoDanmakuItem> {
        ensurePublished(videoId)
        return danmakuDao.list(videoId)
    }

    fun addDanmaku(
        videoId: Long,
        userId: Long,
        command: VideoDanmakuCommand,
    ): VideoDanmakuItem {
        ensurePublished(videoId)
        val content = command.content.trim()
        if (content.isEmpty()) throw ServiceException(ErrorCode.BAD_REQUEST, "弹幕不能为空")
        val mode = (command.mode ?: "scroll").lowercase()
        if (mode !in DANMAKU_MODES) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "弹幕位置不合法")
        }
        val color = command.color?.lowercase() ?: DEFAULT_DANMAKU_COLOR
        val id = danmakuDao.insert(
            videoId = videoId,
            userId = userId,
            content = content,
            timeMs = command.timeMs,
            color = color,
            mode = mode,
        )
        return danmakuDao.findById(id)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "弹幕创建失败")
    }

    private fun ensurePublished(videoId: Long) {
        videoDao.findById(videoId, publishedOnly = true)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "视频不存在或尚未发布")
    }

    companion object {
        private const val MAX_COMMENT_PAGE_SIZE = 50
        private const val DEFAULT_DANMAKU_COLOR = "#ffffff"
        private val DANMAKU_MODES = setOf("scroll", "top", "bottom")
    }
}
