package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * AI 提示词模板。
 */
object AiPromptTable : Table("ai_prompt") {

    val promptKey = varchar("prompt_key", 50)
    val name = varchar("name", 80)
    val content = text("content")
    val description = varchar("description", 300).nullable()
    val updateBy = varchar("update_by", 64).nullable()
    val updateTime = timestampWithTimeZone("update_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(promptKey)
}

/**
 * AI 调用用量。
 */
object AiUsageLogTable : Table("ai_usage_log") {

    val id = long("id").autoIncrement()
    val scene = varchar("scene", 20)
    val provider = varchar("provider", 20).nullable()
    val userId = long("user_id").nullable()
    val success = bool("success").clientDefault { true }
    val promptChars = integer("prompt_chars").clientDefault { 0 }
    val replyChars = integer("reply_chars").clientDefault { 0 }
    val latencyMs = integer("latency_ms").clientDefault { 0 }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
