package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 第三方登录身份。当前支持 QQ，openid 作为 provider_user_id。
 */
object UserOauthTable : Table("user_oauth") {

    val id = long("id").autoIncrement()
    val userId = long("user_id").references(SysUserTable.id)
    val provider = varchar("provider", 20)
    val providerUserId = varchar("provider_user_id", 100)
    val unionId = varchar("union_id", 100).nullable()
    val nickname = varchar("nickname", 100).nullable()
    val avatarUrl = varchar("avatar_url", 500).nullable()
    val lastLoginAt = timestampWithTimeZone("last_login_at").nullable()
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
