package com.nowpass.common.enums

/**
 * 限流维度的取值方式。
 */
enum class LimitType {
    /** 按客户端 IP */
    IP,

    /** 按当前登录用户 */
    USER,

    /** IP 与用户同时计入（两者任一超限即拒绝） */
    IP_AND_USER,
}
