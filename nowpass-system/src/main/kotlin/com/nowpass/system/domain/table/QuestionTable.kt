package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import org.jetbrains.exposed.v1.json.jsonb
import kotlinx.serialization.json.Json
import java.time.OffsetDateTime
import com.nowpass.system.domain.model.QuestionOption

/**
 * 题目表。
 *
 * - `options` 用 PostgreSQL `jsonb`（Exposed 内置 `jsonb<T>()`，走 kotlinx-serialization）
 * - `tags` 用 PostgreSQL `text[]`（Exposed 内置 `array<String>()`）
 * - `deleted` 为逻辑删除，所有查询都必须带 `deleted = false`
 */
object QuestionTable : Table("question") {

    val id = long("id").autoIncrement()
    val categoryId = long("category_id").references(QuestionCategoryTable.id)
    val difficulty = varchar("difficulty", 10).clientDefault { "easy" }
    val title = varchar("title", 200)
    val contentMd = text("content_md")
    val answerMd = text("answer_md")

    // 属性名不能叫 options：Exposed 的 Table 已有 options 成员，会冲突
    val optionJson = jsonb<List<QuestionOption>>("options", Json.Default).nullable()
    val answerKey = varchar("answer_key", 20).nullable()
    val tags = array<String>("tags").clientDefault { emptyList() }
    val viewCount = long("view_count").default(0L)

    val deleted = bool("deleted").clientDefault { false }
    val createBy = varchar("create_by", 64).nullable()
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val updateBy = varchar("update_by", 64).nullable()
    val updateTime = timestampWithTimeZone("update_time").nullable()

    override val primaryKey = PrimaryKey(id)
}
