package com.nowpass.framework.admin

/**
 * 在线会话视图（管理端使用）。
 */
data class OnlineUserItem(
    val tokenId: String,
    val userId: Long,
    val username: String,
    val nickname: String,
    val loginIp: String,
    /** epoch millis */
    val loginTime: Long,
    /** epoch millis */
    val expireAt: Long,
)
