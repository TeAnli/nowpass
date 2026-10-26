package com.nowpass.system.domain.model

import com.nowpass.common.enums.UserStatus
import java.time.OffsetDateTime

/**
 * 用户领域模型（含已装配的角色键与权限点）。
 */
data class SysUser(
    val id: Long,
    val username: String,
    val password: String,
    val nickname: String,
    val email: String,
    val status: UserStatus,
    val remark: String?,
    val createTime: OffsetDateTime?,
    val roleKeys: List<String> = emptyList(),
    val permissions: List<String> = emptyList(),
)

/**
 * 后台用户列表项。
 */
data class UserListItem(
    val id: Long,
    val username: String,
    val nickname: String,
    val email: String,
    val status: String,
    val roleKeys: List<String>,
    val createTime: OffsetDateTime?,
)
