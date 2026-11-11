package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 角色表（固定三个角色，由 Flyway 初始化，不提供管理界面）。
 */
object SysRoleTable : Table("sys_role") {

    val id = long("id").autoIncrement()
    val roleKey = varchar("role_key", 50)
    val roleName = varchar("role_name", 50)
    val sort = integer("sort").clientDefault { 0 }
    val createTime = timestampWithTimeZone("create_time").clientDefault { OffsetDateTime.now() }
    val deleted = bool("deleted").clientDefault { false }

    override val primaryKey = PrimaryKey(id)
}
