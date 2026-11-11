package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 题库大类。分类通过 major_category_id 归属大类，前台按大类分组展示。
 */
object QuestionMajorCategoryTable : Table("question_major_category") {

    val id = long("id").autoIncrement()
    val name = varchar("name", 50)
    val sort = integer("sort").clientDefault { 0 }
    val icon = varchar("icon", 100).nullable()
    val deleted = bool("deleted").clientDefault { false }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val updateTime = timestampWithTimeZone("update_time").nullable()

    override val primaryKey = PrimaryKey(id)
}
