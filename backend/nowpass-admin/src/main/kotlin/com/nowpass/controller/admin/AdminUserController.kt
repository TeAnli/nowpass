package com.nowpass.controller.admin

import com.nowpass.common.annotation.Log
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.BusinessType
import com.nowpass.common.enums.UserStatus
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.framework.admin.UserAdminService
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.request.ChangeRoleRequest
import com.nowpass.request.ChangeStatusRequest
import com.nowpass.request.CreateUserRequest
import com.nowpass.request.ResetUserPasswordRequest
import com.nowpass.system.domain.dao.SysRoleDao
import com.nowpass.system.domain.model.UserListItem
import com.nowpass.system.domain.query.UserPageQuery
import com.nowpass.system.service.SysUserService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 用户管理（后台）。含"注册审批"这一本站特有动作。
 */
@Tag(name = "13. 用户管理", description = "用户列表、建号、审批、停用、改角色、重置密码、删除")
@RestController
@RequestMapping("/api/admin/users")
class AdminUserController(
    private val sysUserService: SysUserService,
    private val userAdminService: UserAdminService,
    private val sysRoleDao: SysRoleDao,
) {

    @Operation(summary = "用户分页列表", description = "status 取 pending 可筛出待审批用户")
    @PreAuthorize("hasAuthority('${Permissions.USER_LIST}')")
    @GetMapping
    fun page(query: UserPageQuery): R<PageResult<UserListItem>> = R.ok(sysUserService.page(query))

    @Operation(summary = "可选角色列表")
    @PreAuthorize("hasAuthority('${Permissions.USER_LIST}')")
    @GetMapping("/roles")
    fun roles(): R<List<Map<String, String>>> =
        R.ok(sysRoleDao.listAll().map { (key, name) -> mapOf("roleKey" to key, "roleName" to name) })

    @Operation(summary = "创建用户", description = "管理员建号，创建即 active")
    @Log(title = "用户管理", businessType = BusinessType.INSERT)
    @PreAuthorize("hasAuthority('${Permissions.USER_ADD}')")
    @PostMapping
    fun create(@Valid @RequestBody request: CreateUserRequest): R<Long> =
        R.ok(
            userAdminService.create(
                username = request.username,
                rawPassword = request.password,
                nickname = request.nickname,
                email = request.email,
                roleKey = request.roleKey,
                operator = SecurityUtils.currentUsername(),
            ),
        )

    @Operation(summary = "变更用户状态", description = "active 启用 / pending 待审批 / disabled 停用；停用会立刻踢下线")
    @Log(title = "用户管理", businessType = BusinessType.UPDATE)
    @PreAuthorize("hasAuthority('${Permissions.USER_APPROVE}')")
    @PutMapping("/{id}/status")
    fun changeStatus(
        @PathVariable id: Long,
        @Valid @RequestBody request: ChangeStatusRequest,
    ): R<Unit> {
        val status = runCatching { UserStatus.valueOf(request.status.trim().uppercase()) }
            .getOrElse { throw ServiceException(ErrorCode.BAD_REQUEST, "状态仅支持 active / pending / disabled") }
        userAdminService.changeStatus(id, status, SecurityUtils.currentUsername())
        return R.ok()
    }

    @Operation(summary = "变更用户角色", description = "改角色会清空该用户会话，需要重新登录")
    @Log(title = "用户管理", businessType = BusinessType.GRANT)
    @PreAuthorize("hasAuthority('${Permissions.USER_EDIT}')")
    @PutMapping("/{id}/role")
    fun changeRole(
        @PathVariable id: Long,
        @Valid @RequestBody request: ChangeRoleRequest,
    ): R<Unit> {
        userAdminService.changeRole(id, request.roleKey)
        return R.ok()
    }

    @Operation(summary = "重置用户密码", description = "重置后该用户全部会话失效")
    @Log(title = "用户管理", businessType = BusinessType.RESET_PASSWORD)
    @PreAuthorize("hasAuthority('${Permissions.USER_RESET_PWD}')")
    @PutMapping("/{id}/reset-password")
    fun resetPassword(
        @PathVariable id: Long,
        @Valid @RequestBody request: ResetUserPasswordRequest,
    ): R<Unit> {
        userAdminService.resetPassword(id, request.newPassword, SecurityUtils.currentUsername())
        return R.ok()
    }

    @Operation(summary = "删除用户", description = "逻辑删除；不能删除自己与超级管理员")
    @Log(title = "用户管理", businessType = BusinessType.DELETE)
    @PreAuthorize("hasAuthority('${Permissions.USER_REMOVE}')")
    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): R<Unit> {
        userAdminService.delete(id, SecurityUtils.currentUsername(), SecurityUtils.currentUserId())
        return R.ok()
    }
}
