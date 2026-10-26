package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 题目分类表（单层，不做树形）。
 */
object QuestionCategoryTable : Table("question_category") {

    val id = long("id").autoIncrement()
    val name = varchar("name", 50)
    val sort = integer("sort").clientDefault { 0 }
    val deleted = bool("deleted").clientDefault { false }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val updateTime = timestampWithTimeZone("update_time").nullable()

    override val primaryKey = PrimaryKey(id)
}
