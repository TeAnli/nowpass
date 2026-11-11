package com.nowpass.system.domain.dao

import com.nowpass.system.domain.model.VideoCategory
import com.nowpass.system.domain.table.VideoCategoryTable
import com.nowpass.system.domain.table.VideoTable
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.count
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * 视频分类数据访问层。
 */
@Repository
class VideoCategoryDao {

    fun listWithCount(): List<VideoCategory> {
        val videoCount = VideoTable.id.count()
        val counts = VideoTable.select(VideoTable.categoryId, videoCount)
            .where { VideoTable.deleted eq false }
            .groupBy(VideoTable.categoryId)
            .associate { it[VideoTable.categoryId] to it[videoCount] }

        return VideoCategoryTable.select(
            VideoCategoryTable.id,
            VideoCategoryTable.name,
            VideoCategoryTable.sort,
        )
            .where { VideoCategoryTable.deleted eq false }
            .orderBy(VideoCategoryTable.sort to SortOrder.ASC)
            .map { row ->
                val id = row[VideoCategoryTable.id]
                VideoCategory(
                    id = id,
                    name = row[VideoCategoryTable.name],
                    sort = row[VideoCategoryTable.sort],
                    videoCount = counts[id] ?: 0L,
                )
            }
    }

    fun findById(id: Long): VideoCategory? =
        VideoCategoryTable.select(
            VideoCategoryTable.id,
            VideoCategoryTable.name,
            VideoCategoryTable.sort,
        )
            .where { (VideoCategoryTable.id eq id) and (VideoCategoryTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.let {
                VideoCategory(
                    id = it[VideoCategoryTable.id],
                    name = it[VideoCategoryTable.name],
                    sort = it[VideoCategoryTable.sort],
                )
            }

    fun existsName(name: String, excludeId: Long? = null): Boolean {
        val base = VideoCategoryTable.select(VideoCategoryTable.id)
            .where { (VideoCategoryTable.name eq name) and (VideoCategoryTable.deleted eq false) }
        excludeId?.let { id -> base.andWhere { VideoCategoryTable.id neq id } }
        return base.limit(1).any()
    }

    fun insert(name: String, sort: Int): Long =
        VideoCategoryTable.insert {
            it[VideoCategoryTable.name] = name
            it[VideoCategoryTable.sort] = sort
            it[VideoCategoryTable.createTime] = OffsetDateTime.now()
        } get VideoCategoryTable.id

    fun update(id: Long, name: String, sort: Int): Int =
        VideoCategoryTable.update({ (VideoCategoryTable.id eq id) and (VideoCategoryTable.deleted eq false) }) {
            it[VideoCategoryTable.name] = name
            it[VideoCategoryTable.sort] = sort
            it[VideoCategoryTable.updateTime] = OffsetDateTime.now()
        }

    fun softDelete(id: Long): Int =
        VideoCategoryTable.update({ (VideoCategoryTable.id eq id) and (VideoCategoryTable.deleted eq false) }) {
            it[VideoCategoryTable.deleted] = true
            it[VideoCategoryTable.updateTime] = OffsetDateTime.now()
        }

    fun countVideos(categoryId: Long): Long =
        VideoTable.select(VideoTable.id)
            .where { (VideoTable.categoryId eq categoryId) and (VideoTable.deleted eq false) }
            .count()
}
