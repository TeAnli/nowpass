package com.nowpass.system.domain.dao

import com.nowpass.system.domain.model.VideoDanmakuItem
import com.nowpass.system.domain.table.SysUserTable
import com.nowpass.system.domain.table.VideoDanmakuTable
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

@Repository
class VideoDanmakuDao {

    private val joined = VideoDanmakuTable.innerJoin(SysUserTable)

    fun list(videoId: Long): List<VideoDanmakuItem> =
        joined.select(
            VideoDanmakuTable.id,
            VideoDanmakuTable.videoId,
            VideoDanmakuTable.userId,
            SysUserTable.nickname,
            VideoDanmakuTable.content,
            VideoDanmakuTable.timeMs,
            VideoDanmakuTable.color,
            VideoDanmakuTable.mode,
            VideoDanmakuTable.createTime,
        )
            .where { (VideoDanmakuTable.videoId eq videoId) and (VideoDanmakuTable.deleted eq false) }
            .orderBy(VideoDanmakuTable.timeMs to SortOrder.ASC, VideoDanmakuTable.id to SortOrder.ASC)
            .limit(MAX_ITEMS)
            .map(::toItem)

    fun insert(
        videoId: Long,
        userId: Long,
        content: String,
        timeMs: Int,
        color: String,
        mode: String,
    ): Long =
        VideoDanmakuTable.insert {
            it[VideoDanmakuTable.videoId] = videoId
            it[VideoDanmakuTable.userId] = userId
            it[VideoDanmakuTable.content] = content
            it[VideoDanmakuTable.timeMs] = timeMs
            it[VideoDanmakuTable.color] = color
            it[VideoDanmakuTable.mode] = mode
            it[createTime] = OffsetDateTime.now()
        } get VideoDanmakuTable.id

    fun findById(id: Long): VideoDanmakuItem? =
        joined.select(
            VideoDanmakuTable.id,
            VideoDanmakuTable.videoId,
            VideoDanmakuTable.userId,
            SysUserTable.nickname,
            VideoDanmakuTable.content,
            VideoDanmakuTable.timeMs,
            VideoDanmakuTable.color,
            VideoDanmakuTable.mode,
            VideoDanmakuTable.createTime,
        )
            .where { (VideoDanmakuTable.id eq id) and (VideoDanmakuTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.let(::toItem)

    private fun toItem(row: ResultRow): VideoDanmakuItem =
        VideoDanmakuItem(
            id = row[VideoDanmakuTable.id],
            videoId = row[VideoDanmakuTable.videoId],
            userId = row[VideoDanmakuTable.userId],
            nickname = row[SysUserTable.nickname],
            content = row[VideoDanmakuTable.content],
            timeMs = row[VideoDanmakuTable.timeMs],
            color = row[VideoDanmakuTable.color],
            mode = row[VideoDanmakuTable.mode],
            createTime = row[VideoDanmakuTable.createTime],
        )

    companion object {
        const val MAX_ITEMS = 500
    }
}
