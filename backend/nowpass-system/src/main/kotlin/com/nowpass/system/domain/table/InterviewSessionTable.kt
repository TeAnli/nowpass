package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * AI 面试场次。
 */
object InterviewSessionTable : Table("interview_session") {

    val id = long("id").autoIncrement()
    val userId = long("user_id").references(SysUserTable.id)
    val questionId = long("question_id").references(QuestionTable.id)
    val questionTitle = varchar("question_title", 200)
    val provider = varchar("provider", 20).nullable()
    val messageCount = integer("message_count").clientDefault { 0 }
    val startedAt = timestampWithTimeZone("started_at").clientDefault { OffsetDateTime.now() }
    val endedAt = timestampWithTimeZone("ended_at").nullable()
    val reportMd = text("report_md").nullable()

    override val primaryKey = PrimaryKey(id)
}

/**
 * 面试对话消息。
 */
object InterviewMessageTable : Table("interview_message") {

    val id = long("id").autoIncrement()
    val sessionId = long("session_id").references(InterviewSessionTable.id)
    val role = varchar("role", 20)
    val content = text("content")
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
