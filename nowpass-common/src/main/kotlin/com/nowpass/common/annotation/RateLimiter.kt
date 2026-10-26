package com.nowpass.common.annotation

import com.nowpass.common.enums.LimitType

/**
 * 接口限流注解。
 *
 * 基于 Redis + Lua 实现固定窗口计数，只应加在敏感端点上
 * （登录 / 注册 / 发送验证码 / 找回密码），不要全站铺开。
 */
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class RateLimiter(
    /** 业务键，留空则使用「类名.方法名」 */
    val key: String = "",
    /** 窗口长度，单位秒 */
    val time: Long = 60,
    /** 窗口内允许的最大次数 */
    val count: Int = 10,
    /** 限流维度 */
    val limitType: LimitType = LimitType.IP,
)
