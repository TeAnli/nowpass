package com.nowpass.controller

import com.nowpass.common.annotation.RateLimiter
import com.nowpass.common.enums.LimitType
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.R
import com.nowpass.framework.auth.AuthService
import com.nowpass.framework.auth.LoginCommand
import com.nowpass.framework.auth.LoginResult
import com.nowpass.framework.auth.RegisterCommand
import com.nowpass.framework.auth.ResetPasswordCommand
import com.nowpass.framework.auth.UserProfile
import com.nowpass.framework.captcha.CaptchaResponse
import com.nowpass.framework.captcha.CaptchaService
import com.nowpass.framework.mail.EmailCodeService
import com.nowpass.framework.mail.EmailScene
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.framework.web.IpUtils
import com.nowpass.request.EmailCodeRequest
import com.nowpass.request.LoginRequest
import com.nowpass.request.RegisterRequest
import com.nowpass.request.ResetPasswordRequest
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 认证相关接口。
 */
@Tag(name = "01. 认证", description = "验证码、登录、注册、找回密码、登出")
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val authService: AuthService,
    private val captchaService: CaptchaService,
    private val emailCodeService: EmailCodeService,
) {

    @Operation(summary = "获取图形验证码", description = "返回 uuid 与 data URI 图片；验证码 2 分钟有效且一次性")
    @GetMapping("/captcha")
    fun captcha(): R<CaptchaResponse> = R.ok(captchaService.generate())

    @Operation(summary = "发送邮箱验证码", description = "scene 取 register 或 reset；需先通过图形验证码，按 IP 限流")
    @RateLimiter(key = "auth:email-code", time = 60, count = 3, limitType = LimitType.IP)
    @PostMapping("/email-code")
    fun sendEmailCode(@Valid @RequestBody request: EmailCodeRequest): R<Unit> {
        val scene = when (request.scene.trim().lowercase()) {
            EmailScene.REGISTER.key -> EmailScene.REGISTER
            EmailScene.RESET_PASSWORD.key -> EmailScene.RESET_PASSWORD
            else -> throw ServiceException(ErrorCode.BAD_REQUEST, "scene 仅支持 register 或 reset")
        }
        captchaService.verify(request.captchaUuid, request.captchaCode)
        emailCodeService.send(scene, request.email.trim().lowercase())
        return R.ok()
    }

    @Operation(summary = "登录", description = "需图形验证码；连续失败 5 次锁定 15 分钟")
    @RateLimiter(key = "auth:login", time = 60, count = 10, limitType = LimitType.IP_AND_USER)
    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        httpRequest: HttpServletRequest,
    ): R<LoginResult> {
        val result = authService.login(
            LoginCommand(
                username = request.username,
                password = request.password,
                captchaUuid = request.captchaUuid,
                captchaCode = request.captchaCode,
            ),
            loginIp = IpUtils.getClientIp(httpRequest),
        )
        return R.ok(result)
    }

    @Operation(summary = "注册", description = "需邮箱验证码；按配置决定注册后是否需要管理员审批")
    @RateLimiter(key = "auth:register", time = 3600, count = 5, limitType = LimitType.IP)
    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): R<Long> {
        val userId = authService.register(
            RegisterCommand(
                username = request.username,
                password = request.password,
                nickname = request.nickname,
                email = request.email,
                emailCode = request.emailCode,
                captchaUuid = null,
                captchaCode = null,
            ),
        )
        return R.ok("注册成功，待管理员审批后即可登录", userId)
    }

    @Operation(summary = "找回密码", description = "需邮箱验证码；改密成功后该账号所有会话失效")
    @RateLimiter(key = "auth:reset-password", time = 3600, count = 5, limitType = LimitType.IP)
    @PostMapping("/reset-password")
    fun resetPassword(@Valid @RequestBody request: ResetPasswordRequest): R<Unit> {
        authService.resetPassword(
            ResetPasswordCommand(
                email = request.email,
                emailCode = request.emailCode,
                newPassword = request.newPassword,
                captchaUuid = null,
                captchaCode = null,
            ),
        )
        return R.ok("密码已重置，请使用新密码登录")
    }

    @Operation(summary = "登出", description = "删除 Redis 中的当前会话")
    @PostMapping("/logout")
    fun logout(): R<Unit> {
        SecurityUtils.currentUserOrNull()?.let { authService.logout(it.tokenId) }
        return R.ok()
    }

    @Operation(summary = "当前登录用户信息", description = "含角色、权限点与后台入口标记")
    @GetMapping("/me")
    fun me(): R<UserProfile> = R.ok(authService.profileOf(SecurityUtils.currentUser()))
}
