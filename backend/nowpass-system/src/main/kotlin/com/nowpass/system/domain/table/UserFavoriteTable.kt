package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 用户收藏的题目。
 */
object UserFavoriteTable : Table("user_favorite") {

    val userId = long("user_id").references(SysUserTable.id)
    val questionId = long("question_id").references(QuestionTable.id)
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(userId, questionId)
}
