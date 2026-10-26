package com.nowpass.framework.admin

import com.nowpass.common.enums.UserStatus
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.framework.security.RolePermissions
import com.nowpass.framework.security.TokenService
import com.nowpass.system.domain.model.SysUser
import com.nowpass.system.service.SysUserService
import org.slf4j.LoggerFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 管理端的用户运维动作。
 *
 * 之所以放在 framework 而不是 system：这些动作需要 `PasswordEncoder` 与 `TokenService`，
 * 二者都属于"安全实现"，system 层刻意不依赖它们。
 */
@Service
class UserAdminService(
    private val sysUserService: SysUserService,
    private val passwordEncoder: PasswordEncoder,
    private val tokenService: TokenService,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun create(
        username: String,
        rawPassword: String,
        nickname: String?,
        email: String,
        roleKey: String,
        operator: String,
    ): Long {
        val finalRole = roleKey.ifBlank { RolePermissions.ROLE_USER }
        return sysUserService.create(
            username = username.trim(),
            encodedPassword = passwordEncoder.encode(rawPassword),
            nickname = nickname?.trim()?.takeIf { it.isNotEmpty() } ?: username.trim(),
            email = email.trim().lowercase(),
            status = UserStatus.ACTIVE.name.lowercase(),
            roleKey = finalRole,
            remark = "管理员创建",
            operator = operator,
        )
    }

    /**
     * 审批通过 / 停用 / 恢复。停用与删除必须**立刻踢掉会话**，
     * 否则有状态 token 在剩余有效期内仍然可用（最长 2 小时）。
     */
    @Transactional
    fun changeStatus(userId: Long, status: UserStatus, operator: String) {
        sysUserService.updateStatus(userId, status.name.lowercase(), operator)
        if (status != UserStatus.ACTIVE) {
            val kicked = tokenService.removeByUserId(userId)
            log.info("用户状态变更：userId={}, status={}, 强制下线会话数={}", userId, status, kicked)
        }
    }

    @Transactional
    fun changeRole(userId: Long, roleKey: String) {
        sysUserService.updateRole(userId, roleKey)
        // 角色变了，旧的权限快照就失效了，必须重新登录才生效
        tokenService.removeByUserId(userId)
    }

    @Transactional
    fun resetPassword(userId: Long, rawPassword: String, operator: String) {
        sysUserService.updatePassword(userId, passwordEncoder.encode(rawPassword), operator)
        tokenService.removeByUserId(userId)
    }

    @Transactional
    fun delete(userId: Long, operator: String, currentUserId: Long) {
        if (userId == currentUserId) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "不能删除当前登录账号")
        }
        val user: SysUser = sysUserService.findById(userId)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "用户不存在")
        if (user.roleKeys.any { it.equals(RolePermissions.ROLE_SUPER_ADMIN, true) }) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "不能删除超级管理员账号")
        }
        sysUserService.delete(userId, operator)
        tokenService.removeByUserId(userId)
    }
}
