package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 刷题记录：是否看过、是否揭晓答案、自评掌握度。
 */
object UserQuestionProgressTable : Table("user_question_progress") {

    val userId = long("user_id").references(SysUserTable.id)
    val questionId = long("question_id").references(QuestionTable.id)
    val viewCount = integer("view_count").clientDefault { 0 }
    val answerRevealed = bool("answer_revealed").clientDefault { false }
    val selfRating = varchar("self_rating", 10).nullable()
    val lastViewAt = timestampWithTimeZone("last_view_at").clientDefault { OffsetDateTime.now() }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(userId, questionId)
}
