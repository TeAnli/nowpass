package com.nowpass.system.domain.dao

import com.nowpass.system.domain.table.SysRoleTable
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.springframework.stereotype.Repository

/**
 * 角色数据访问层。
 */
@Repository
class SysRoleDao {

    fun listAll(): List<Pair<String, String>> =
        SysRoleTable.select(SysRoleTable.roleKey, SysRoleTable.roleName)
            .where { SysRoleTable.deleted eq false }
            .orderBy(SysRoleTable.sort to SortOrder.ASC)
            .map { it[SysRoleTable.roleKey] to it[SysRoleTable.roleName] }

    fun findIdByRoleKey(roleKey: String): Long? =
        SysRoleTable.select(SysRoleTable.id)
            .where { (SysRoleTable.roleKey eq roleKey) and (SysRoleTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.get(SysRoleTable.id)

    fun existsRoleKey(roleKey: String): Boolean =
        SysRoleTable.selectAll()
            .where { (SysRoleTable.roleKey eq roleKey) and (SysRoleTable.deleted eq false) }
            .limit(1)
            .any()
}
