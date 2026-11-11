package com.nowpass.controller.admin

import com.nowpass.common.annotation.Log
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.BusinessType
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.R
import com.nowpass.framework.admin.OnlineUserItem
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.framework.security.TokenService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 在线会话（后台）。
 *
 * 这是选"有状态 token"换来的能力：因为会话就存在 Redis 里，
 * 枚举在线用户与强制下线几乎是免费的。
 */
@Tag(name = "14. 在线用户", description = "查看在线会话、强制下线")
@RestController
@RequestMapping("/api/admin/online")
class OnlineUserController(
    private val tokenService: TokenService,
) {

    @Operation(summary = "在线会话列表")
    @PreAuthorize("hasAuthority('${Permissions.ONLINE_LIST}')")
    @GetMapping
    fun list(): R<List<OnlineUserItem>> =
        R.ok(
            tokenService.listOnline().map {
                OnlineUserItem(
                    tokenId = it.tokenId,
                    userId = it.userId,
                    username = it.username,
                    nickname = it.nickname,
                    loginIp = it.loginIp,
                    loginTime = it.loginTime,
                    expireAt = it.expireAt,
                )
            },
        )

    @Operation(summary = "强制下线", description = "按会话 tokenId 删除，用户下一个请求即失效")
    @Log(title = "在线用户", businessType = BusinessType.FORCE)
    @PreAuthorize("hasAuthority('${Permissions.ONLINE_FORCE_LOGOUT}')")
    @DeleteMapping("/{tokenId}")
    fun forceLogout(@PathVariable tokenId: String): R<Unit> {
        if (!tokenService.exists(tokenId)) {
            throw ServiceException(ErrorCode.NOT_FOUND, "该会话不存在或已过期")
        }
        tokenService.remove(tokenId)
        return R.ok()
    }
}
