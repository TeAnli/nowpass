package com.nowpass.framework.auth

/**
 * 登录入参。
 */
data class LoginCommand(
    val username: String,
    val password: String,
    val captchaUuid: String?,
    val captchaCode: String?,
)

/**
 * 注册入参。
 */
data class RegisterCommand(
    val username: String,
    val password: String,
    val nickname: String?,
    val email: String,
    val emailCode: String?,
    val captchaUuid: String?,
    val captchaCode: String?,
)

/**
 * 找回密码入参。
 */
data class ResetPasswordCommand(
    val email: String,
    val emailCode: String?,
    val newPassword: String,
    val captchaUuid: String?,
    val captchaCode: String?,
)

/**
 * 修改密码入参。
 */
data class ChangePasswordCommand(
    val oldPassword: String,
    val newPassword: String,
)
