package com.nowpass.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * 登录入参。
 */
data class LoginRequest(
    @field:NotBlank(message = "用户名不能为空")
    val username: String,

    @field:NotBlank(message = "密码不能为空")
    val password: String,

    val captchaUuid: String? = null,
    val captchaCode: String? = null,
)

/**
 * 注册入参。
 */
data class RegisterRequest(
    @field:NotBlank(message = "用户名不能为空")
    val username: String,

    @field:NotBlank(message = "密码不能为空")
    @field:Size(min = 8, max = 64, message = "密码长度需在 8~64 位之间")
    val password: String,

    @field:Size(max = 30, message = "昵称不能超过 30 个字符")
    val nickname: String? = null,

    @field:NotBlank(message = "邮箱不能为空")
    @field:Email(message = "邮箱格式不正确")
    val email: String,

    val emailCode: String? = null,
)

/**
 * 发送邮箱验证码入参。scene 仅支持 register / reset。
 */
data class EmailCodeRequest(
    @field:NotBlank(message = "邮箱不能为空")
    @field:Email(message = "邮箱格式不正确")
    val email: String,

    @field:NotBlank(message = "场景不能为空")
    val scene: String,

    val captchaUuid: String? = null,
    val captchaCode: String? = null,
)

/**
 * 找回密码入参。
 */
data class ResetPasswordRequest(
    @field:NotBlank(message = "邮箱不能为空")
    @field:Email(message = "邮箱格式不正确")
    val email: String,

    val emailCode: String? = null,

    @field:NotBlank(message = "新密码不能为空")
    @field:Size(min = 8, max = 64, message = "密码长度需在 8~64 位之间")
    val newPassword: String,
)

/**
 * 修改自己的密码。
 */
data class ChangePasswordRequest(
    @field:NotBlank(message = "原密码不能为空")
    val oldPassword: String,

    @field:NotBlank(message = "新密码不能为空")
    @field:Size(min = 8, max = 64, message = "密码长度需在 8~64 位之间")
    val newPassword: String,
)

/**
 * 修改自己的昵称。
 */
data class UpdateProfileRequest(
    @field:NotBlank(message = "昵称不能为空")
    @field:Size(max = 30, message = "昵称不能超过 30 个字符")
    val nickname: String,
)
