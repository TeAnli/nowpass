package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * AI 智能体写操作审计。
 */
object AgentActionLogTable : Table("agent_action_log") {

    val id = long("id").autoIncrement()
    val userId = long("user_id")
    val tool = varchar("tool", 50)
    val argsJson = text("args_json")
    val resultText = text("result_text").nullable()
    val success = bool("success").clientDefault { false }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
