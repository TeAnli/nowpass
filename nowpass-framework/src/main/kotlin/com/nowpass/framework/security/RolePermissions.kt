package com.nowpass.framework.security

import com.nowpass.common.constant.Permissions

/**
 * 角色 -> 权限点映射。
 *
 * 权限点直接写在代码里，不建菜单表与角色-菜单关联表，
 * 权限点直接写进代码。好处是权限模型可被编译期检查、评审时一眼看全；
 * 代价是新增权限点需要改代码发版，而不是后台点两下——对本站规模是可接受的。
 */
object RolePermissions {

    const val ROLE_SUPER_ADMIN = "superadmin"
    const val ROLE_ADMIN = "admin"
    const val ROLE_USER = "user"

    /**
     * 普通用户：**不需要任何权限点**。
     *
     * 用户端接口（questions、categories、user 个人中心）只要求"已登录"，
     * 权限点只用于管理端的 admin 接口。早期版本这里给了 question:list，
     * 结果普通用户能通过后台的题目列表接口（虽然不含答案，但仍是越权），已修正。
     */
    val USER: List<String> = emptyList()

    /** 管理员：题库与分类全权、用户审批与重置密码、在线用户只读、日志只读 */
    val ADMIN: List<String> = listOf(
        Permissions.QUESTION_LIST,
        Permissions.QUESTION_QUERY,
        Permissions.QUESTION_ADD,
        Permissions.QUESTION_EDIT,
        Permissions.QUESTION_REMOVE,
        Permissions.CATEGORY_LIST,
        Permissions.CATEGORY_ADD,
        Permissions.CATEGORY_EDIT,
        Permissions.CATEGORY_REMOVE,
        Permissions.USER_LIST,
        Permissions.USER_ADD,
        Permissions.USER_EDIT,
        Permissions.USER_APPROVE,
        Permissions.USER_RESET_PWD,
        Permissions.ONLINE_LIST,
        Permissions.OPERLOG_LIST,
    )

    /** 超级管理员：管理员权限 + 危险操作（删用户、强退在线会话） */
    val SUPER_ADMIN: List<String> = ADMIN + listOf(
        Permissions.USER_REMOVE,
        Permissions.ONLINE_FORCE_LOGOUT,
        Permissions.ALL,
    )

    /**
     * 汇总某用户的权限点。多个角色取并集。
     */
    fun permissionsOf(roleKeys: List<String>): List<String> {
        val merged = LinkedHashSet<String>()
        roleKeys.forEach { roleKey ->
            when (roleKey.lowercase()) {
                ROLE_SUPER_ADMIN -> merged.addAll(SUPER_ADMIN)
                ROLE_ADMIN -> merged.addAll(ADMIN)
                ROLE_USER -> merged.addAll(USER)
                else -> Unit
            }
        }
        return merged.toList()
    }

    /** 用户是否拥有后台入口（决定前端是否显示「后台管理」） */
    fun canEnterAdmin(roleKeys: List<String>): Boolean =
        roleKeys.any { it.equals(ROLE_ADMIN, true) || it.equals(ROLE_SUPER_ADMIN, true) }
}
