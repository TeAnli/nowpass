package com.nowpass.request

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * 管理员创建用户。
 */
data class CreateUserRequest(
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

    /** superadmin / admin / user */
    @field:NotBlank(message = "角色不能为空")
    val roleKey: String,
)

/**
 * 变更用户状态：active / pending / disabled。
 */
data class ChangeStatusRequest(
    @field:NotBlank(message = "状态不能为空")
    val status: String,
)

/**
 * 变更用户角色。
 */
data class ChangeRoleRequest(
    @field:NotBlank(message = "角色不能为空")
    val roleKey: String,
)

/**
 * 管理员重置某用户密码。
 */
data class ResetUserPasswordRequest(
    @field:NotBlank(message = "新密码不能为空")
    @field:Size(min = 8, max = 64, message = "密码长度需在 8~64 位之间")
    val newPassword: String,
)

/**
 * 分类新增 / 编辑。
 */
data class CategoryRequest(
    @field:NotBlank(message = "分类名称不能为空")
    @field:Size(max = 50, message = "分类名称不能超过 50 个字符")
    val name: String,

    @field:Size(max = 64, message = "图标名不能超过 64 个字符")
    val icon: String? = null,

    val sort: Int = 0,
)
