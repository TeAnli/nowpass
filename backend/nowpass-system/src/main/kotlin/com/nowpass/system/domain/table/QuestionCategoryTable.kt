package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 题目分类表。分类归属一个大类，前台按大类分组。
 */
object QuestionCategoryTable : Table("question_category") {

    val id = long("id").autoIncrement()
    val name = varchar("name", 50)
    val icon = varchar("icon", 64).nullable()
    val sort = integer("sort").clientDefault { 0 }
    val majorCategoryId = long("major_category_id").references(QuestionMajorCategoryTable.id).nullable()
    val deleted = bool("deleted").clientDefault { false }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val updateTime = timestampWithTimeZone("update_time").nullable()

    override val primaryKey = PrimaryKey(id)
}
