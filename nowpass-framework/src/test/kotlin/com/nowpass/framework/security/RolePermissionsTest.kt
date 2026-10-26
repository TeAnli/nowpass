package com.nowpass.framework.security

import com.nowpass.common.constant.Permissions
import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RolePermissionsTest {

    @Test
    fun `普通用户没有任何权限点`() {
        // 这条曾经写错过：给了 question:list 导致普通用户能访问后台题目列表
        assertTrue(RolePermissions.permissionsOf(listOf("user")).isEmpty())
    }

    @Test
    fun `管理员拥有题目与用户管理权限，但没有危险操作`() {
        val permissions = RolePermissions.permissionsOf(listOf("admin"))
        assertTrue(Permissions.QUESTION_ADD in permissions)
        assertTrue(Permissions.USER_APPROVE in permissions)
        assertFalse(Permissions.USER_REMOVE in permissions)
        assertFalse(Permissions.ONLINE_FORCE_LOGOUT in permissions)
    }

    @Test
    fun `超级管理员拥有全部权限含通配符`() {
        val permissions = RolePermissions.permissionsOf(listOf("superadmin"))
        assertTrue(Permissions.ALL in permissions)
        assertTrue(Permissions.USER_REMOVE in permissions)
        assertTrue(Permissions.ONLINE_FORCE_LOGOUT in permissions)
    }

    @Test
    fun `多角色取并集且去重`() {
        val permissions = RolePermissions.permissionsOf(listOf("user", "admin"))
        assertTrue(Permissions.QUESTION_ADD in permissions)
        assertTrue(permissions.size == permissions.distinct().size)
    }

    @Test
    fun `未知角色不产生任何权限`() {
        assertTrue(RolePermissions.permissionsOf(listOf("ghost")).isEmpty())
    }

    @Test
    fun `只有管理员与超管可进入后台`() {
        assertFalse(RolePermissions.canEnterAdmin(listOf("user")))
        assertTrue(RolePermissions.canEnterAdmin(listOf("admin")))
        assertTrue(RolePermissions.canEnterAdmin(listOf("superadmin")))
    }
}
