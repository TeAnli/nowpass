package com.nowpass.framework.auth

import com.nowpass.common.constant.CacheKeys
import com.nowpass.common.enums.UserStatus
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.framework.captcha.CaptchaService
import com.nowpass.framework.config.NowPassProperties
import com.nowpass.framework.mail.EmailCodeService
import com.nowpass.framework.mail.EmailScene
import com.nowpass.framework.ratelimit.RedisRateLimiter
import com.nowpass.framework.security.LoginUser
import com.nowpass.framework.security.RolePermissions
import com.nowpass.framework.security.TokenService
import com.nowpass.system.domain.model.SysUser
import com.nowpass.system.service.SysUserService
import org.slf4j.LoggerFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 认证编排：登录、注册、找回密码、修改密码。
 *
 * 校验顺序是刻意设计的：**验证码 -> 锁定 -> 用户 -> 密码 -> 状态**。
 * 先用验证码挡住脚本，再判断锁定，避免攻击者用登录接口探测账号是否存在。
 */
@Service
class AuthService(
    private val sysUserService: SysUserService,
    private val tokenService: TokenService,
    private val captchaService: CaptchaService,
    private val emailCodeService: EmailCodeService,
    private val passwordEncoder: PasswordEncoder,
    private val redisRateLimiter: RedisRateLimiter,
    private val properties: NowPassProperties,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun login(command: LoginCommand, loginIp: String): LoginResult {
        captchaService.verify(command.captchaUuid, command.captchaCode)

        val username = command.username.trim()
        if (redisRateLimiter.isMarked(CacheKeys.pwdLock(username))) {
            throw ServiceException(ErrorCode.ACCOUNT_LOCKED)
        }

        val user = sysUserService.findByUsername(username) ?: run {
            recordLoginFailure(username)
            throw ServiceException(ErrorCode.LOGIN_FAILED)
        }

        if (!passwordEncoder.matches(command.password, user.password)) {
            recordLoginFailure(username)
            throw ServiceException(ErrorCode.LOGIN_FAILED)
        }

        when (user.status) {
            UserStatus.PENDING -> throw ServiceException(ErrorCode.ACCOUNT_PENDING)
            UserStatus.DISABLED -> throw ServiceException(ErrorCode.ACCOUNT_DISABLED)
            UserStatus.ACTIVE -> Unit
        }

        // 登录成功：清掉失败计数
        redisRateLimiter.reset(CacheKeys.pwdRetry(username))

        val permissions = RolePermissions.permissionsOf(user.roleKeys)
        val loginUser = tokenService.create(
            userId = user.id,
            username = user.username,
            nickname = user.nickname,
            email = user.email,
            roles = user.roleKeys,
            permissions = permissions,
            loginIp = loginIp,
        )
        log.info("登录成功：user={}, ip={}", username, loginIp)

        return LoginResult(
            token = loginUser.tokenId,
            expireAt = loginUser.expireAt,
            user = toProfile(user, permissions),
        )
    }

    fun logout(tokenId: String) {
        tokenService.remove(tokenId)
    }

    /**
     * 注册：邮箱验证码证明邮箱归属，注册后按配置进入 pending 或直接 active。
     *
     * 这里**不再重复要求图形验证码**：邮箱验证码本身已是"人能收到邮件"的证明，
     * 而图形验证码在「发送验证码」接口上已经验过一次。同一次注册要填两次图形验证码
     * 属于自找的摩擦，没有安全收益。
     */
    @Transactional
    fun register(command: RegisterCommand): Long {
        val email = command.email.trim().lowercase()
        emailCodeService.verifyAndConsume(EmailScene.REGISTER, email, command.emailCode)

        val username = command.username.trim()
        validateUsername(username)
        validatePassword(command.password)
        if (sysUserService.existsByUsername(username)) {
            throw ServiceException(ErrorCode.USERNAME_EXISTS)
        }
        if (sysUserService.existsByEmail(email)) {
            throw ServiceException(ErrorCode.EMAIL_EXISTS)
        }

        val status = if (properties.register.requireApproval) {
            UserStatus.PENDING
        } else {
            UserStatus.ACTIVE
        }

        val userId = sysUserService.create(
            username = username,
            encodedPassword = passwordEncoder.encode(command.password),
            nickname = command.nickname?.trim()?.takeIf { it.isNotEmpty() } ?: username,
            email = email,
            status = status.name.lowercase(),
            roleKey = RolePermissions.ROLE_USER,
            remark = "自助注册",
            operator = "register",
        )
        log.info("用户注册成功：username={}, status={}", username, status)
        return userId
    }

    /**
     * 找回密码：邮箱验证码换一次改密机会，改完踢掉该用户全部旧会话。
     */
    @Transactional
    fun resetPassword(command: ResetPasswordCommand) {
        val email = command.email.trim().lowercase()
        val user = sysUserService.findByEmail(email)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "该邮箱未注册")

        emailCodeService.verifyAndConsume(EmailScene.RESET_PASSWORD, email, command.emailCode)
        validatePassword(command.newPassword)

        sysUserService.updatePassword(user.id, passwordEncoder.encode(command.newPassword), "self-reset")
        val kicked = tokenService.removeByUserId(user.id)
        log.info("密码已重置：email={}, 强制下线会话数={}", email, kicked)
    }

    @Transactional
    fun changePassword(userId: Long, command: ChangePasswordCommand) {
        val user = sysUserService.findById(userId)
            ?: throw ServiceException(ErrorCode.UNAUTHORIZED)
        if (!passwordEncoder.matches(command.oldPassword, user.password)) {
            throw ServiceException(ErrorCode.PASSWORD_MISMATCH)
        }
        validatePassword(command.newPassword)
        sysUserService.updatePassword(userId, passwordEncoder.encode(command.newPassword), user.username)
        // 改密后清空全部会话（含当前这次），强制各处重新登录
        tokenService.removeByUserId(userId)
    }

    fun profileOf(loginUser: LoginUser): UserProfile = UserProfile(
        id = loginUser.userId,
        username = loginUser.username,
        nickname = loginUser.nickname,
        email = loginUser.email,
        roles = loginUser.roles,
        permissions = loginUser.permissions,
        canEnterAdmin = RolePermissions.canEnterAdmin(loginUser.roles),
    )

    private fun toProfile(user: SysUser, permissions: List<String>): UserProfile = UserProfile(
        id = user.id,
        username = user.username,
        nickname = user.nickname,
        email = user.email,
        roles = user.roleKeys,
        permissions = permissions,
        canEnterAdmin = RolePermissions.canEnterAdmin(user.roleKeys),
    )

    private fun recordLoginFailure(username: String) {
        val attempts = redisRateLimiter.increment(
            key = CacheKeys.pwdRetry(username),
            windowSeconds = properties.login.lockMinutes * 60,
        )
        if (attempts >= properties.login.maxRetry) {
            redisRateLimiter.mark(CacheKeys.pwdLock(username), properties.login.lockMinutes)
            redisRateLimiter.reset(CacheKeys.pwdRetry(username))
            log.warn("账号因连续登录失败被锁定：username={}, 锁定时长={}分钟", username, properties.login.lockMinutes)
        }
    }

    private fun validateUsername(username: String) {
        if (username.length !in 3..30) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "用户名长度需在 3~30 个字符之间")
        }
        if (!USERNAME_PATTERN.matches(username)) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "用户名只能包含字母、数字、下划线，且以字母开头")
        }
    }

    private fun validatePassword(password: String) {
        if (password.length < 8) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "密码长度不能少于 8 位")
        }
        if (password.length > 64) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "密码长度不能超过 64 位")
        }
        val hasLetter = password.any { it.isLetter() }
        val hasDigit = password.any { it.isDigit() }
        if (!hasLetter || !hasDigit) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "密码必须同时包含字母和数字")
        }
    }

    companion object {
        private val USERNAME_PATTERN = Regex("^[A-Za-z][A-Za-z0-9_]{2,29}$")
    }
}
