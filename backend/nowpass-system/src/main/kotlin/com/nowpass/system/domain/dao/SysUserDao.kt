package com.nowpass.system.domain.dao

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.model.SysUser
import com.nowpass.system.domain.model.UserListItem
import com.nowpass.system.domain.query.UserPageQuery
import com.nowpass.system.domain.table.SysRoleTable
import com.nowpass.system.domain.table.SysUserRoleTable
import com.nowpass.system.domain.table.SysUserTable
import com.nowpass.system.mapper.toSysUser
import com.nowpass.system.mapper.toUserListItem
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.like
import org.jetbrains.exposed.v1.core.or
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * 用户数据访问层。
 *
 * 所有查询都显式带 `deleted = false`：Exposed 没有 JPA 的 `@SQLRestriction`，
 * 逻辑删除靠约定 + 这里统一封装。
 */
@Repository
class SysUserDao {

    fun findByUsername(username: String): SysUser? =
        SysUserTable.selectAll()
            .where { (SysUserTable.username eq username) and (SysUserTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.let { it.toSysUser(roleKeysOf(it[SysUserTable.id])) }

    fun findByEmail(email: String): SysUser? =
        SysUserTable.selectAll()
            .where { (SysUserTable.email eq email) and (SysUserTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.let { it.toSysUser(roleKeysOf(it[SysUserTable.id])) }

    fun findById(id: Long): SysUser? =
        SysUserTable.selectAll()
            .where { (SysUserTable.id eq id) and (SysUserTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.let { it.toSysUser(roleKeysOf(id)) }

    fun existsByUsername(username: String): Boolean =
        SysUserTable.selectAll()
            .where { (SysUserTable.username eq username) and (SysUserTable.deleted eq false) }
            .limit(1)
            .any()

    fun existsByEmail(email: String): Boolean =
        SysUserTable.selectAll()
            .where { (SysUserTable.email eq email) and (SysUserTable.deleted eq false) }
            .limit(1)
            .any()

    fun insert(
        username: String,
        encodedPassword: String,
        nickname: String,
        email: String,
        status: String,
        remark: String? = null,
        operator: String = "system",
    ): Long =
        SysUserTable.insert {
            it[SysUserTable.username] = username
            it[SysUserTable.password] = encodedPassword
            it[SysUserTable.nickname] = nickname
            it[SysUserTable.email] = email
            it[SysUserTable.status] = status
            it[SysUserTable.remark] = remark
            it[SysUserTable.createBy] = operator
            it[SysUserTable.createTime] = OffsetDateTime.now()
        } get SysUserTable.id

    fun updatePassword(id: Long, encodedPassword: String, operator: String): Int =
        SysUserTable.update({ (SysUserTable.id eq id) and (SysUserTable.deleted eq false) }) {
            it[SysUserTable.password] = encodedPassword
            it[SysUserTable.updateBy] = operator
            it[SysUserTable.updateTime] = OffsetDateTime.now()
        }

    fun updateStatus(id: Long, status: String, operator: String): Int =
        SysUserTable.update({ (SysUserTable.id eq id) and (SysUserTable.deleted eq false) }) {
            it[SysUserTable.status] = status
            it[SysUserTable.updateBy] = operator
            it[SysUserTable.updateTime] = OffsetDateTime.now()
        }

    fun updateProfile(id: Long, nickname: String, operator: String): Int =
        SysUserTable.update({ (SysUserTable.id eq id) and (SysUserTable.deleted eq false) }) {
            it[SysUserTable.nickname] = nickname
            it[SysUserTable.updateBy] = operator
            it[SysUserTable.updateTime] = OffsetDateTime.now()
        }

    fun softDelete(id: Long, operator: String): Int =
        SysUserTable.update({ (SysUserTable.id eq id) and (SysUserTable.deleted eq false) }) {
            it[SysUserTable.deleted] = true
            it[SysUserTable.updateBy] = operator
            it[SysUserTable.updateTime] = OffsetDateTime.now()
        }

    fun page(query: UserPageQuery): PageResult<UserListItem> {
        val base = SysUserTable.selectAll().where { SysUserTable.deleted eq false }
        query.status?.takeIf { it.isNotBlank() }?.let { status ->
            base.andWhere { SysUserTable.status eq status }
        }
        query.keyword?.takeIf { it.isNotBlank() }?.let { keyword ->
            base.andWhere {
                (SysUserTable.username like "%$keyword%") or
                    (SysUserTable.nickname like "%$keyword%") or
                    (SysUserTable.email like "%$keyword%")
            }
        }

        val total = base.copy().count()
        val rows = base.orderBy(SysUserTable.id to SortOrder.DESC)
            .limit(query.pageSize)
            .offset(query.offset)
            .toList()

        val rolesByUser = roleKeysOf(rows.map { it[SysUserTable.id] })
        return PageResult.of(
            total = total,
            page = query.page,
            pageSize = query.pageSize,
            rows = rows.map { it.toUserListItem(rolesByUser[it[SysUserTable.id]].orEmpty()) },
        )
    }

    fun countAll(): Long =
        SysUserTable.selectAll().where { SysUserTable.deleted eq false }.count()

    fun roleKeysOf(userId: Long): List<String> =
        roleKeysOf(listOf(userId))[userId].orEmpty()

    /** 批量取角色，避免列表页 N+1 */
    fun roleKeysOf(userIds: List<Long>): Map<Long, List<String>> {
        if (userIds.isEmpty()) return emptyMap()
        return (SysUserRoleTable innerJoin SysRoleTable)
            .select(SysUserRoleTable.userId, SysRoleTable.roleKey)
            .where { SysUserRoleTable.userId inList userIds }
            .groupBy({ it[SysUserRoleTable.userId] }, { it[SysRoleTable.roleKey] })
    }

    /** 用户角色整体替换（本站一个用户一个角色） */
    fun replaceRole(userId: Long, roleKey: String): Boolean {
        val roleId = (SysRoleTable innerJoin SysUserRoleTable)
            .select(SysRoleTable.id)
            .where { (SysUserRoleTable.userId eq userId) and (SysRoleTable.roleKey eq roleKey) }
            .limit(1)
            .firstOrNull()
            ?.get(SysRoleTable.id)
            ?: SysRoleTable.select(SysRoleTable.id)
                .where { (SysRoleTable.roleKey eq roleKey) and (SysRoleTable.deleted eq false) }
                .limit(1)
                .firstOrNull()
                ?.get(SysRoleTable.id)
            ?: return false

        SysUserRoleTable.deleteWhere { SysUserRoleTable.userId eq userId }
        SysUserRoleTable.insert {
            it[SysUserRoleTable.userId] = userId
            it[SysUserRoleTable.roleId] = roleId
        }
        return true
    }

    fun rawRowById(id: Long): ResultRow? =
        SysUserTable.selectAll().where { SysUserTable.id eq id }.limit(1).firstOrNull()
}
