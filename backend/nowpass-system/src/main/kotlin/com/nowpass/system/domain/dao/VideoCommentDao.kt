package com.nowpass.system.domain.dao

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.model.VideoCommentItem
import com.nowpass.system.domain.model.VideoCommentOwner
import com.nowpass.system.domain.query.VideoCommentPageQuery
import com.nowpass.system.domain.table.SysUserTable
import com.nowpass.system.domain.table.VideoCommentTable
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

@Repository
class VideoCommentDao {

    private val joined = VideoCommentTable.innerJoin(SysUserTable)

    fun page(videoId: Long, query: VideoCommentPageQuery): PageResult<VideoCommentItem> {
        val base = joined.select(
            VideoCommentTable.id,
            VideoCommentTable.videoId,
            VideoCommentTable.userId,
            SysUserTable.nickname,
            VideoCommentTable.content,
            VideoCommentTable.createTime,
        ).where {
            (VideoCommentTable.videoId eq videoId) and (VideoCommentTable.deleted eq false)
        }
        val total = base.copy().count()
        val rows = base
            .orderBy(VideoCommentTable.createTime to SortOrder.DESC, VideoCommentTable.id to SortOrder.DESC)
            .limit(query.pageSize)
            .offset(query.offset)
            .map(::toItem)
        return PageResult.of(total, query.page, query.pageSize, rows)
    }

    fun findById(id: Long): VideoCommentItem? =
        joined.select(
            VideoCommentTable.id,
            VideoCommentTable.videoId,
            VideoCommentTable.userId,
            SysUserTable.nickname,
            VideoCommentTable.content,
            VideoCommentTable.createTime,
        )
            .where { (VideoCommentTable.id eq id) and (VideoCommentTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.let(::toItem)

    fun findOwner(id: Long): VideoCommentOwner? =
        VideoCommentTable.select(VideoCommentTable.videoId, VideoCommentTable.userId)
            .where { (VideoCommentTable.id eq id) and (VideoCommentTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.let { VideoCommentOwner(it[VideoCommentTable.videoId], it[VideoCommentTable.userId]) }

    fun insert(videoId: Long, userId: Long, content: String): Long =
        VideoCommentTable.insert {
            it[VideoCommentTable.videoId] = videoId
            it[VideoCommentTable.userId] = userId
            it[VideoCommentTable.content] = content
            it[createTime] = OffsetDateTime.now()
        } get VideoCommentTable.id

    fun softDelete(id: Long): Int =
        VideoCommentTable.update({ (VideoCommentTable.id eq id) and (VideoCommentTable.deleted eq false) }) {
            it[deleted] = true
            it[updateTime] = OffsetDateTime.now()
        }

    private fun toItem(row: ResultRow): VideoCommentItem =
        VideoCommentItem(
            id = row[VideoCommentTable.id],
            videoId = row[VideoCommentTable.videoId],
            userId = row[VideoCommentTable.userId],
            nickname = row[SysUserTable.nickname],
            content = row[VideoCommentTable.content],
            createTime = row[VideoCommentTable.createTime],
        )
}
