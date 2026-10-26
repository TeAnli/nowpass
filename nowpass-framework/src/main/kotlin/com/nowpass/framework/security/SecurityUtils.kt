package com.nowpass.framework.security

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import org.springframework.security.core.Authentication
import org.springframework.security.core.context.SecurityContextHolder

/**
 * 当前登录用户读取工具。
 */
object SecurityUtils {

    fun currentUserOrNull(): LoginUser? {
        val authentication = SecurityContextHolder.getContext().authentication ?: return null
        if (!authentication.isAuthenticated) return null
        return authentication.principal as? LoginUser
    }

    fun currentUser(): LoginUser =
        currentUserOrNull() ?: throw ServiceException(ErrorCode.UNAUTHORIZED)

    fun currentUsername(): String = currentUser().username

    fun currentUserId(): Long = currentUser().userId
}
