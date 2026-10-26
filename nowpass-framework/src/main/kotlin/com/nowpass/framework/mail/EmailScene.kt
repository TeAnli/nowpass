package com.nowpass.framework.mail

/**
 * 邮件验证码的使用场景。
 */
enum class EmailScene(val key: String, val subject: String) {
    REGISTER("register", "【NowPass】注册验证码"),
    RESET_PASSWORD("reset", "【NowPass】重置密码验证码"),
}
