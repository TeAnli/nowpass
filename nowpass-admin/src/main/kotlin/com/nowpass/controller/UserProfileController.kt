package com.nowpass.controller

import com.nowpass.common.response.R
import com.nowpass.framework.auth.AuthService
import com.nowpass.framework.auth.ChangePasswordCommand
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.request.ChangePasswordRequest
import com.nowpass.request.UpdateProfileRequest
import com.nowpass.system.service.SysUserService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 个人中心（v1 不支持改邮箱，避免再来一次邮箱验证流程）。
 */
@Tag(name = "03. 个人中心", description = "修改昵称、修改密码")
@RestController
@RequestMapping("/api/user")
class UserProfileController(
    private val authService: AuthService,
    private val sysUserService: SysUserService,
) {

    @Operation(summary = "修改昵称")
    @PutMapping("/profile")
    fun updateProfile(@Valid @RequestBody request: UpdateProfileRequest): R<Unit> {
        val current = SecurityUtils.currentUser()
        sysUserService.updateProfile(current.userId, request.nickname.trim(), current.username)
        return R.ok()
    }

    @Operation(summary = "修改密码", description = "成功后该账号全部会话失效，需要重新登录")
    @PutMapping("/password")
    fun changePassword(@Valid @RequestBody request: ChangePasswordRequest): R<Unit> {
        val current = SecurityUtils.currentUser()
        authService.changePassword(
            current.userId,
            ChangePasswordCommand(oldPassword = request.oldPassword, newPassword = request.newPassword),
        )
        return R.ok("密码已修改，请重新登录")
    }
}
