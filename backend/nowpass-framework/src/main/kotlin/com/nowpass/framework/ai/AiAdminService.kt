package com.nowpass.framework.ai

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.PageResult
import com.nowpass.framework.config.NowPassProperties
import com.nowpass.system.domain.dao.AiAdminDao
import com.nowpass.system.domain.model.AiOverview
import com.nowpass.system.domain.model.AiPrompt
import com.nowpass.system.domain.model.AiUsageItem
import com.nowpass.system.domain.model.AiUsageRecord
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * AI 后台管理：提示词编辑、用量统计、配置总览。
 */
@Service
@Transactional
class AiAdminService(
    private val aiAdminDao: AiAdminDao,
    private val properties: NowPassProperties,
) {

    @Transactional(readOnly = true)
    fun overview(): AiOverview {
        val interview = properties.interview
        val configured = interview.enabled && interview.apiKey.isNotBlank()
        val provider = if (configured) {
            if (interview.baseUrl.contains("deepseek")) "deepseek" else "openai"
        } else {
            "local"
        }
        return AiOverview(
            interviewProvider = provider,
            interviewModel = interview.model.takeIf { configured },
            interviewConfigured = configured,
            ttsEnabled = properties.tts.configured,
            ttsVoice = properties.tts.voice,
            ttsProvider = "aliyun",
            usage = aiAdminDao.usageSummary(),
        )
    }

    @Transactional(readOnly = true)
    fun prompts(): List<AiPrompt> = aiAdminDao.listPrompts()

    fun updatePrompt(key: String, content: String, operator: String) {
        val trimmed = content.trim()
        if (trimmed.isEmpty()) throw ServiceException(ErrorCode.BAD_REQUEST, "提示词不能为空")
        if (trimmed.length > MAX_PROMPT_CHARS) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "提示词不能超过 $MAX_PROMPT_CHARS 字")
        }
        if (aiAdminDao.findPrompt(key) == null) {
            throw ServiceException(ErrorCode.NOT_FOUND, "提示词不存在：$key")
        }
        aiAdminDao.updatePrompt(key, trimmed, operator)
    }

    /** 读取提示词并替换占位符；缺失时返回 null，由调用方回退到内置文案。 */
    @Transactional(readOnly = true)
    fun renderPrompt(key: String, values: Map<String, String>): String? {
        val template = aiAdminDao.findPrompt(key)?.content ?: return null
        var rendered = template
        values.forEach { (name, value) ->
            rendered = rendered.replace("{$name}", value)
        }
        return rendered
    }

    fun recordUsage(record: AiUsageRecord) = aiAdminDao.recordUsage(record)

    @Transactional(readOnly = true)
    fun usagePage(page: Int, pageSize: Int): PageResult<AiUsageItem> =
        aiAdminDao.usagePage((page - 1).toLong() * pageSize, pageSize)

    companion object {
        const val PROMPT_INTERVIEW_SYSTEM = "interview_system"
        const val PROMPT_SUPPORT_SYSTEM = "support_system"
        const val PROMPT_AGENT_SYSTEM = "agent_system"
        private const val MAX_PROMPT_CHARS = 8000
    }
}
