package com.nowpass.framework.init

import com.nowpass.common.enums.UserStatus
import com.nowpass.framework.config.NowPassProperties
import com.nowpass.framework.security.RolePermissions
import com.nowpass.system.service.SysUserService
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

/**
 * 初始管理员创建（幂等）。
 *
 * 为什么不用 Flyway 插入：BCrypt 哈希写死在 SQL 里无法维护、也无法随配置变更，
 * 改由启动时用 `PasswordEncoder` 生成。放在 `ApplicationRunner` 里执行，
 * 保证 Flyway 迁移已完成、表已存在。
 */
@Component
class AdminInitializer(
    private val sysUserService: SysUserService,
    private val passwordEncoder: PasswordEncoder,
    private val properties: NowPassProperties,
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments) {
        val config = properties.init
        val username = config.adminUsername.trim()
        if (username.isEmpty()) return

        if (sysUserService.existsByUsername(username)) {
            log.debug("超级管理员已存在，跳过初始化：{}", username)
            return
        }

        runCatching {
            sysUserService.create(
                username = username,
                encodedPassword = passwordEncoder.encode(config.adminPassword),
                nickname = config.adminNickname,
                email = config.adminEmail,
                status = UserStatus.ACTIVE.name.lowercase(),
                roleKey = RolePermissions.ROLE_SUPER_ADMIN,
                remark = "系统初始化账号",
                operator = "system",
            )
            log.warn(
                "已创建超级管理员：{}（初始密码见 nowpass.init.admin-password），请首次登录后立即修改密码",
                username,
            )
        }.onFailure {
            log.error("超级管理员初始化失败（请检查 nowpass.init.* 与 sys_user 唯一约束）", it)
        }
    }
}
