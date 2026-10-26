package com.nowpass.controller.admin

import com.nowpass.common.constant.Permissions
import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.system.domain.model.OperLogItem
import com.nowpass.system.domain.query.OperLogPageQuery
import com.nowpass.system.service.OperLogService
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 操作日志（后台，只读）。
 */
@Tag(name = "15. 操作日志", description = "只读查看 @Log 落库的操作记录")
@RestController
@RequestMapping("/api/admin/oper-logs")
class OperLogController(
    private val operLogService: OperLogService,
) {

    @Operation(summary = "操作日志分页列表")
    @PreAuthorize("hasAuthority('${Permissions.OPERLOG_LIST}')")
    @GetMapping
    fun page(query: OperLogPageQuery): R<PageResult<OperLogItem>> = R.ok(operLogService.page(query))
}
