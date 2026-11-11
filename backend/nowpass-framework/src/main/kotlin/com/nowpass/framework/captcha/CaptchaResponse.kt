package com.nowpass.framework.captcha

/**
 * 图形验证码下发结果：uuid 用于校验，img 为 data URI，前端可直接放进 `<img src>`。
 */
data class CaptchaResponse(
    val uuid: String,
    val img: String,
)
