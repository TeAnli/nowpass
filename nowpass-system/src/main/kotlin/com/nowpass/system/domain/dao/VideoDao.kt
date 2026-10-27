package com.nowpass.system.domain.dao

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.model.VideoObjectRefs
import com.nowpass.system.domain.model.VideoRecord
import com.nowpass.system.domain.model.VideoUpsertCommand
import com.nowpass.system.domain.query.VideoPageQuery
import com.nowpass.system.domain.table.VideoCategoryTable
import com.nowpass.system.domain.table.VideoTable
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.less
import org.jetbrains.exposed.v1.core.like
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * 视频元数据数据访问层。
 *
 * 视频量级很小（<200），tag 过滤在内存完成，避免为 text[] 引入脆弱的原生 SQL；
 * 规模上来后再改成 PostgreSQL `tags @> array[?]` 或独立标签表。
 */
@Repository
class VideoDao {

    private val joined = VideoTable.innerJoin(VideoCategoryTable)

    fun page(query: VideoPageQuery): PageResult<VideoRecord> {
        val base = joined.select(
            VideoTable.id,
            VideoTable.title,
            VideoTable.description,
            VideoTable.speaker,
            VideoTable.categoryId,
            VideoCategoryTable.name,
            VideoTable.questionId,
            VideoTable.tags,
            VideoTable.videoObjectKey,
            VideoTable.coverObjectKey,
            VideoTable.durationSeconds,
            VideoTable.sizeBytes,
            VideoTable.contentType,
            VideoTable.status,
            VideoTable.publishedAt,
            VideoTable.createTime,
            VideoTable.updateTime,
        ).where { VideoTable.deleted eq false }

        query.status?.takeIf { it.isNotBlank() }?.let { status ->
            base.andWhere { VideoTable.status eq status }
        }
        query.categoryId?.let { categoryId ->
            base.andWhere { VideoTable.categoryId eq categoryId }
        }
        query.keyword?.takeIf { it.isNotBlank() }?.let { keyword ->
            base.andWhere { VideoTable.title like "%$keyword%" }
        }

        val tag = query.tag?.takeIf { it.isNotBlank() }
        val records = base.map { toRecord(it) }
            .filter { tag == null || it.tags.contains(tag) }
            .sortedWith(compareByDescending<VideoRecord> { it.publishedAt ?: it.createTime }.thenByDescending { it.id })
        val total = records.size
        val rows = records.drop((query.page - 1) * query.pageSize).take(query.pageSize)
        return PageResult.of(total.toLong(), query.page, query.pageSize, rows)
    }

    fun findById(id: Long, publishedOnly: Boolean = false): VideoRecord? {
        val base = joined.select(
            VideoTable.id,
            VideoTable.title,
            VideoTable.description,
            VideoTable.speaker,
            VideoTable.categoryId,
            VideoCategoryTable.name,
            VideoTable.questionId,
            VideoTable.tags,
            VideoTable.videoObjectKey,
            VideoTable.coverObjectKey,
            VideoTable.durationSeconds,
            VideoTable.sizeBytes,
            VideoTable.contentType,
            VideoTable.status,
            VideoTable.publishedAt,
            VideoTable.createTime,
            VideoTable.updateTime,
        ).where { (VideoTable.id eq id) and (VideoTable.deleted eq false) }
        if (publishedOnly) base.andWhere { VideoTable.status eq "published" }
        return base.limit(1).firstOrNull()?.let { toRecord(it) }
    }

    fun insert(command: VideoUpsertCommand, createBy: String = "admin"): Long =
        VideoTable.insert {
            it[title] = command.title.trim()
            it[description] = command.description?.trim()?.takeIf { value -> value.isNotEmpty() }
            it[speaker] = command.speaker?.trim()?.takeIf { value -> value.isNotEmpty() }
            it[categoryId] = command.categoryId!!
            it[questionId] = command.questionId
            it[tags] = normalizeTags(command.tags)
            it[durationSeconds] = command.durationSeconds
            it[status] = "draft"
            it[VideoTable.createBy] = createBy
            it[createTime] = OffsetDateTime.now()
        } get VideoTable.id

    fun updateMetadata(id: Long, command: VideoUpsertCommand, updateBy: String = "admin"): Int =
        VideoTable.update({ (VideoTable.id eq id) and (VideoTable.deleted eq false) }) {
            it[title] = command.title.trim()
            it[description] = command.description?.trim()?.takeIf { value -> value.isNotEmpty() }
            it[speaker] = command.speaker?.trim()?.takeIf { value -> value.isNotEmpty() }
            it[categoryId] = command.categoryId!!
            it[questionId] = command.questionId
            it[tags] = normalizeTags(command.tags)
            it[durationSeconds] = command.durationSeconds
            it[VideoTable.updateBy] = updateBy
            it[updateTime] = OffsetDateTime.now()
        }

    fun setVideoObjectKey(id: Long, objectKey: String): Int =
        VideoTable.update({ (VideoTable.id eq id) and (VideoTable.deleted eq false) }) {
            it[videoObjectKey] = objectKey
            it[status] = "draft"
            it[publishedAt] = null
            it[updateTime] = OffsetDateTime.now()
        }

    fun setCoverObjectKey(id: Long, objectKey: String): Int =
        VideoTable.update({ (VideoTable.id eq id) and (VideoTable.deleted eq false) }) {
            it[coverObjectKey] = objectKey
            it[status] = "draft"
            it[publishedAt] = null
            it[updateTime] = OffsetDateTime.now()
        }

    fun finalize(id: Long, sizeBytes: Long, contentType: String, durationSeconds: Int): Int =
        VideoTable.update({ (VideoTable.id eq id) and (VideoTable.deleted eq false) }) {
            it[VideoTable.sizeBytes] = sizeBytes
            it[VideoTable.contentType] = contentType
            it[VideoTable.durationSeconds] = durationSeconds
            it[updateTime] = OffsetDateTime.now()
        }

    fun publish(id: Long): Int =
        VideoTable.update({ (VideoTable.id eq id) and (VideoTable.deleted eq false) }) {
            it[status] = "published"
            it[publishedAt] = OffsetDateTime.now()
            it[updateTime] = OffsetDateTime.now()
        }

    fun offline(id: Long): Int =
        VideoTable.update({ (VideoTable.id eq id) and (VideoTable.deleted eq false) }) {
            it[status] = "offline"
            it[updateTime] = OffsetDateTime.now()
        }

    fun softDelete(id: Long): Int =
        VideoTable.update({ (VideoTable.id eq id) and (VideoTable.deleted eq false) }) {
            it[deleted] = true
            it[status] = "offline"
            it[updateTime] = OffsetDateTime.now()
        }

    fun hardDelete(id: Long): Int =
        VideoTable.deleteWhere { VideoTable.id eq id }

    fun staleDrafts(cutoff: OffsetDateTime): List<VideoObjectRefs> =
        VideoTable.select(VideoTable.id, VideoTable.videoObjectKey, VideoTable.coverObjectKey)
            .where { (VideoTable.deleted eq false) and (VideoTable.status eq "draft") and (VideoTable.createTime less cutoff) }
            .map { VideoObjectRefs(it[VideoTable.id], it[VideoTable.videoObjectKey], it[VideoTable.coverObjectKey]) }

    fun deletedBefore(cutoff: OffsetDateTime): List<VideoObjectRefs> =
        VideoTable.select(VideoTable.id, VideoTable.videoObjectKey, VideoTable.coverObjectKey)
            .where { (VideoTable.deleted eq true) and (VideoTable.updateTime less cutoff) }
            .map { VideoObjectRefs(it[VideoTable.id], it[VideoTable.videoObjectKey], it[VideoTable.coverObjectKey]) }

    fun allObjectKeys(): Set<String> =
        VideoTable.select(VideoTable.videoObjectKey, VideoTable.coverObjectKey)
            .mapNotNull { row ->
                listOfNotNull(row[VideoTable.videoObjectKey], row[VideoTable.coverObjectKey])
            }
            .flatten()
            .toSet()

    fun publishedTags(): List<String> {
        val all = VideoTable.select(VideoTable.tags)
            .where { (VideoTable.deleted eq false) and (VideoTable.status eq "published") }
            .map { row -> row[VideoTable.tags] }
            .flatten()
        return all.map { it.trim() }.filter { it.isNotEmpty() }.distinct().sorted()
    }

    private fun normalizeTags(tags: List<String>): List<String> =
        tags.map { it.trim() }.filter { it.isNotEmpty() }.distinct().take(20)

    private fun toRecord(row: ResultRow): VideoRecord =
        VideoRecord(
            id = row[VideoTable.id],
            title = row[VideoTable.title],
            description = row[VideoTable.description],
            speaker = row[VideoTable.speaker],
            categoryId = row[VideoTable.categoryId],
            categoryName = row[VideoCategoryTable.name],
            questionId = row[VideoTable.questionId],
            tags = row[VideoTable.tags],
            videoObjectKey = row[VideoTable.videoObjectKey],
            coverObjectKey = row[VideoTable.coverObjectKey],
            durationSeconds = row[VideoTable.durationSeconds],
            sizeBytes = row[VideoTable.sizeBytes],
            contentType = row[VideoTable.contentType],
            status = row[VideoTable.status],
            publishedAt = row[VideoTable.publishedAt],
            createTime = row[VideoTable.createTime],
            updateTime = row[VideoTable.updateTime],
        )
}
