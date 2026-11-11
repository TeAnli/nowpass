package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table

/**
 * 用户-角色关联表。
 */
object SysUserRoleTable : Table("sys_user_role") {

    val userId = long("user_id").references(SysUserTable.id)
    val roleId = long("role_id").references(SysRoleTable.id)

    override val primaryKey = PrimaryKey(userId, roleId)
}
