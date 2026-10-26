package com.nowpass.framework.auth

/**
 * 当前用户档案（返回给前端，不含密码等敏感字段）。
 */
data class UserProfile(
    val id: Long,
    val username: String,
    val nickname: String,
    val email: String,
    val roles: List<String>,
    val permissions: List<String>,
    /** 是否显示「后台管理」入口 */
    val canEnterAdmin: Boolean,
)

/**
 * 登录成功结果。
 */
data class LoginResult(
    val token: String,
    /** epoch millis */
    val expireAt: Long,
    val user: UserProfile,
)
