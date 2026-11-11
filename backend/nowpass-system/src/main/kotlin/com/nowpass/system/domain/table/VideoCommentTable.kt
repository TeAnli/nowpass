package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 视频评论。软删除，保留审计时间。
 */
object VideoCommentTable : Table("video_comment") {

    val id = long("id").autoIncrement()
    val videoId = long("video_id").references(VideoTable.id)
    val userId = long("user_id").references(SysUserTable.id)
    val content = varchar("content", 500)
    val deleted = bool("deleted").clientDefault { false }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val updateTime = timestampWithTimeZone("update_time").nullable()

    override val primaryKey = PrimaryKey(id)
}
