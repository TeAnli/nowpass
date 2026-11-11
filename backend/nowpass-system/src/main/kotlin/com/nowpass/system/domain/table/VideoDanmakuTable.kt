package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 视频时间点弹幕。timeMs 对应视频内毫秒位置。
 */
object VideoDanmakuTable : Table("video_danmaku") {

    val id = long("id").autoIncrement()
    val videoId = long("video_id").references(VideoTable.id)
    val userId = long("user_id").references(SysUserTable.id)
    val content = varchar("content", 60)
    val timeMs = integer("time_ms")
    val color = varchar("color", 7).clientDefault { "#ffffff" }
    val mode = varchar("mode", 10).clientDefault { "scroll" }
    val deleted = bool("deleted").clientDefault { false }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
