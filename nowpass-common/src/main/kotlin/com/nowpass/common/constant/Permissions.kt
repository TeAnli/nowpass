package com.nowpass.common.constant

/**
 * 权限点常量。
 *
 * 权限点直接写在代码里，不建菜单表，
 * 由 `@PreAuthorize("hasAuthority('question:add')")` 直接引用。
 * 角色到权限点的映射见 `RolePermissions`（framework 模块）。
 */
object Permissions {

    /** 超级管理员通配权限 */
    const val ALL = "*:*:*"

    // ---- 题目 ----
    const val QUESTION_LIST = "question:list"
    const val QUESTION_QUERY = "question:query"
    const val QUESTION_ADD = "question:add"
    const val QUESTION_EDIT = "question:edit"
    const val QUESTION_REMOVE = "question:remove"

    // ---- 分类 ----
    const val CATEGORY_LIST = "category:list"
    const val CATEGORY_ADD = "category:add"
    const val CATEGORY_EDIT = "category:edit"
    const val CATEGORY_REMOVE = "category:remove"

    // ---- 用户 ----
    const val USER_LIST = "system:user:list"
    const val USER_ADD = "system:user:add"
    const val USER_EDIT = "system:user:edit"
    const val USER_REMOVE = "system:user:remove"
    const val USER_RESET_PWD = "system:user:resetPwd"
    const val USER_APPROVE = "system:user:approve"

    // ---- 在线用户 ----
    const val ONLINE_LIST = "monitor:online:list"
    const val ONLINE_FORCE_LOGOUT = "monitor:online:forceLogout"

    // ---- 操作日志 ----
    const val OPERLOG_LIST = "monitor:operlog:list"
}
