package com.nowpass.system.domain.model

data class UserOauth(
    val id: Long,
    val userId: Long,
    val provider: String,
    val providerUserId: String,
    val unionId: String?,
    val nickname: String?,
    val avatarUrl: String?,
)
