package com.nowpass.framework.security

/**
 * 登录态快照，序列化后存入 Redis（`login_tokens:{tokenId}`）。
 *
 * 有状态会话的核心：每次请求只读 Redis，不回查数据库；
 * 因此**用户被停用/删除时必须主动清理其 token**（见 `TokenService.removeByUserId`），
 * 否则旧 token 最多还能用到过期。这个代价换取的是"可即时强退"与"在线用户列表"。
 */
data class LoginUser(
    val tokenId: String,
    val userId: Long,
    val username: String,
    val nickname: String,
    val email: String,
    val roles: List<String>,
    val permissions: List<String>,
    val loginIp: String,
    /** 登录时间（epoch millis） */
    val loginTime: Long,
    /** 过期时间（epoch millis） */
    val expireAt: Long,
) {
    /** Spring Security 的权限集合：权限点 + `ROLE_xxx` 角色名 */
    fun authorities(): List<String> = permissions + roles.map { "ROLE_$it" }
}
