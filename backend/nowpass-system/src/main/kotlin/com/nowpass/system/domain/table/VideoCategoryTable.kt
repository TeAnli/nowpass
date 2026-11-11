package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 视频讲解分类（独立于题目分类）。
 */
object VideoCategoryTable : Table("video_category") {

    val id = long("id").autoIncrement()
    val name = varchar("name", 50)
    val sort = integer("sort").clientDefault { 0 }
    val deleted = bool("deleted").clientDefault { false }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val updateTime = timestampWithTimeZone("update_time").nullable()

    override val primaryKey = PrimaryKey(id)
}
