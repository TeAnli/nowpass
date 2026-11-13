package com.nowpass.controller.admin

import com.nowpass.common.annotation.Log
import com.nowpass.common.constant.Permissions
import com.nowpass.common.enums.BusinessType
import com.nowpass.common.response.PageResult
import com.nowpass.common.response.R
import com.nowpass.framework.ai.AiAdminService
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.system.domain.model.AiOverview
import com.nowpass.system.domain.model.AiPrompt
import com.nowpass.system.domain.model.AiPromptUpdate
import com.nowpass.system.domain.model.AiUsageItem
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.validation.Valid
import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * AI 后台管理：配置总览、提示词编辑、调用用量。
 */
@Tag(name = "09. AI 管理", description = "AI 配置总览、提示词与用量统计")
@RestController
@RequestMapping("/api/admin/ai")
class AdminAiController(
    private val aiAdminService: AiAdminService,
) {

    @Operation(summary = "AI 配置总览", description = "模型、TTS 状态与调用汇总，不含密钥")
    @PreAuthorize("hasAuthority('${Permissions.AI_VIEW}')")
    @GetMapping("/overview")
    fun overview(): R<AiOverview> = R.ok(aiAdminService.overview())

    @Operation(summary = "提示词列表")
    @PreAuthorize("hasAuthority('${Permissions.AI_VIEW}')")
    @GetMapping("/prompts")
    fun prompts(): R<List<AiPrompt>> = R.ok(aiAdminService.prompts())

    @Operation(summary = "更新提示词")
    @PreAuthorize("hasAuthority('${Permissions.AI_EDIT}')")
    @Log(title = "AI 提示词", businessType = BusinessType.UPDATE)
    @PutMapping("/prompts/{key}")
    fun updatePrompt(
        @PathVariable key: String,
        @Valid @RequestBody body: AiPromptUpdate,
    ): R<Unit> {
        aiAdminService.updatePrompt(key, body.content, SecurityUtils.currentUsername())
        return R.ok("提示词已更新")
    }

    @Operation(summary = "AI 调用用量")
    @PreAuthorize("hasAuthority('${Permissions.AI_VIEW}')")
    @GetMapping("/usage")
    fun usage(
        @RequestParam(defaultValue = "1") @Min(1) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) pageSize: Int,
    ): R<PageResult<AiUsageItem>> = R.ok(aiAdminService.usagePage(page, pageSize))
}
