package com.nowpass.common.enums

/**
 * 用户状态。注册后为 PENDING，需管理员审批（或无需审批时直接 ACTIVE）。
 */
enum class UserStatus {
    /** 待审批 / 待激活 */
    PENDING,

    /** 正常 */
    ACTIVE,

    /** 停用 */
    DISABLED;

    companion object {
        fun of(value: String?): UserStatus =
            entries.firstOrNull { it.name.equals(value, ignoreCase = true) } ?: PENDING
    }
}
