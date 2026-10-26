package com.nowpass.system.service

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.dao.SysUserDao
import com.nowpass.system.domain.model.SysUser
import com.nowpass.system.domain.model.UserListItem
import com.nowpass.system.domain.query.UserPageQuery
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 用户领域服务。
 *
 * **不涉及密码加密/校验**：调用方传入的必须是已编码的密码，
 * 加密策略由 framework 层的 `PasswordEncoder` 决定。
 */
@Service
@Transactional
class SysUserService(
    private val sysUserDao: SysUserDao,
) {

    fun findByUsername(username: String): SysUser? = sysUserDao.findByUsername(username)

    fun findByEmail(email: String): SysUser? = sysUserDao.findByEmail(email)

    fun findById(id: Long): SysUser? = sysUserDao.findById(id)

    fun existsByUsername(username: String): Boolean = sysUserDao.existsByUsername(username)

    fun existsByEmail(email: String): Boolean = sysUserDao.existsByEmail(email)

    fun create(
        username: String,
        encodedPassword: String,
        nickname: String,
        email: String,
        status: String,
        roleKey: String,
        remark: String? = null,
        operator: String = "system",
    ): Long {
        if (sysUserDao.existsByUsername(username)) {
            throw ServiceException(ErrorCode.USERNAME_EXISTS)
        }
        if (sysUserDao.existsByEmail(email)) {
            throw ServiceException(ErrorCode.EMAIL_EXISTS)
        }
        val id = sysUserDao.insert(
            username = username,
            encodedPassword = encodedPassword,
            nickname = nickname,
            email = email,
            status = status,
            remark = remark,
            operator = operator,
        )
        sysUserDao.replaceRole(id, roleKey)
        return id
    }

    fun updatePassword(id: Long, encodedPassword: String, operator: String) {
        val affected = sysUserDao.updatePassword(id, encodedPassword, operator)
        if (affected == 0) throw ServiceException(ErrorCode.NOT_FOUND, "用户不存在")
    }

    fun updateStatus(id: Long, status: String, operator: String) {
        val affected = sysUserDao.updateStatus(id, status, operator)
        if (affected == 0) throw ServiceException(ErrorCode.NOT_FOUND, "用户不存在")
    }

    fun updateRole(id: Long, roleKey: String) {
        if (!sysUserDao.replaceRole(id, roleKey)) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "角色不存在：$roleKey")
        }
    }

    fun updateProfile(id: Long, nickname: String, operator: String) {
        val affected = sysUserDao.updateProfile(id, nickname, operator)
        if (affected == 0) throw ServiceException(ErrorCode.NOT_FOUND, "用户不存在")
    }

    fun delete(id: Long, operator: String) {
        val affected = sysUserDao.softDelete(id, operator)
        if (affected == 0) throw ServiceException(ErrorCode.NOT_FOUND, "用户不存在")
    }

    @Transactional(readOnly = true)
    fun page(query: UserPageQuery): PageResult<UserListItem> = sysUserDao.page(query)

    @Transactional(readOnly = true)
    fun countAll(): Long = sysUserDao.countAll()
}
