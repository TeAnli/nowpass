package com.nowpass.system.domain.table

import com.nowpass.common.enums.UserStatus
import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 用户表。前台用户与管理员共用一张表，靠角色区分。
 */
object SysUserTable : Table("sys_user") {

    val id = long("id").autoIncrement()

    val username = varchar("username", 30)
    val password = varchar("password", 100)
    val nickname = varchar("nickname", 30)
    val email = varchar("email", 100)
    val status = varchar("status", 10).clientDefault { UserStatus.PENDING.name.lowercase() }
    val remark = varchar("remark", 500).nullable()

    val createBy = varchar("create_by", 64).nullable()
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val updateBy = varchar("update_by", 64).nullable()
    val updateTime = timestampWithTimeZone("update_time").nullable()

    val deleted = bool("deleted").clientDefault { false }

    override val primaryKey = PrimaryKey(id)
}
