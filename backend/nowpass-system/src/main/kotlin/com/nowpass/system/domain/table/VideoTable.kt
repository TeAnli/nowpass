package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 视频讲解元数据。文件本体存 MinIO，这里只保存 object key。
 */
object VideoTable : Table("video") {

    val id = long("id").autoIncrement()
    val title = varchar("title", 200)
    val description = text("description").nullable()
    val speaker = varchar("speaker", 100).nullable()
    val categoryId = long("category_id").references(VideoCategoryTable.id)
    val questionId = long("question_id").references(QuestionTable.id).nullable()
    val tags = array<String>("tags").clientDefault { emptyList() }
    val videoObjectKey = varchar("video_object_key", 512).nullable()
    val coverObjectKey = varchar("cover_object_key", 512).nullable()
    val durationSeconds = integer("duration_seconds").clientDefault { 0 }
    val sizeBytes = long("size_bytes").clientDefault { 0L }
    val contentType = varchar("content_type", 100).nullable()
    val status = varchar("status", 20).clientDefault { "draft" }
    val publishedAt = timestampWithTimeZone("published_at").nullable()
    val deleted = bool("deleted").clientDefault { false }
    val createBy = varchar("create_by", 64).nullable()
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val updateBy = varchar("update_by", 64).nullable()
    val updateTime = timestampWithTimeZone("update_time").nullable()

    override val primaryKey = PrimaryKey(id)
}
