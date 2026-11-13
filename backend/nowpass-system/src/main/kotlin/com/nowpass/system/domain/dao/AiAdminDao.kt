package com.nowpass.system.domain.dao

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.model.AiPrompt
import com.nowpass.system.domain.model.AiUsageItem
import com.nowpass.system.domain.model.AiUsageRecord
import com.nowpass.system.domain.model.AiUsageSummary
import com.nowpass.system.domain.table.AiPromptTable
import com.nowpass.system.domain.table.AiUsageLogTable
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * AI 提示词与用量数据访问层。
 */
@Repository
class AiAdminDao {

    fun findPrompt(key: String): AiPrompt? =
        AiPromptTable.select(
            AiPromptTable.promptKey,
            AiPromptTable.name,
            AiPromptTable.content,
            AiPromptTable.description,
            AiPromptTable.updateTime,
        )
            .where { AiPromptTable.promptKey eq key }
            .limit(1)
            .firstOrNull()
            ?.let {
                AiPrompt(
                    key = it[AiPromptTable.promptKey],
                    name = it[AiPromptTable.name],
                    content = it[AiPromptTable.content],
                    description = it[AiPromptTable.description],
                    updateTime = it[AiPromptTable.updateTime],
                )
            }

    fun listPrompts(): List<AiPrompt> =
        AiPromptTable.select(
            AiPromptTable.promptKey,
            AiPromptTable.name,
            AiPromptTable.content,
            AiPromptTable.description,
            AiPromptTable.updateTime,
        )
            .orderBy(AiPromptTable.promptKey to SortOrder.ASC)
            .map {
                AiPrompt(
                    key = it[AiPromptTable.promptKey],
                    name = it[AiPromptTable.name],
                    content = it[AiPromptTable.content],
                    description = it[AiPromptTable.description],
                    updateTime = it[AiPromptTable.updateTime],
                )
            }

    fun updatePrompt(key: String, content: String, operator: String): Int =
        AiPromptTable.update({ AiPromptTable.promptKey eq key }) {
            it[AiPromptTable.content] = content
            it[updateBy] = operator
            it[updateTime] = OffsetDateTime.now()
        }

    fun recordUsage(record: AiUsageRecord) {
        AiUsageLogTable.insert {
            it[scene] = record.scene
            it[provider] = record.provider
            it[userId] = record.userId
            it[success] = record.success
            it[promptChars] = record.promptChars
            it[replyChars] = record.replyChars
            it[latencyMs] = record.latencyMs
            it[createTime] = OffsetDateTime.now()
        }
    }

    fun usagePage(offset: Long, limit: Int): PageResult<AiUsageItem> {
        val base = AiUsageLogTable.select(
            AiUsageLogTable.id,
            AiUsageLogTable.scene,
            AiUsageLogTable.provider,
            AiUsageLogTable.userId,
            AiUsageLogTable.success,
            AiUsageLogTable.promptChars,
            AiUsageLogTable.replyChars,
            AiUsageLogTable.latencyMs,
            AiUsageLogTable.createTime,
        )
        val total = base.copy().count()
        val rows = base
            .orderBy(AiUsageLogTable.id to SortOrder.DESC)
            .limit(limit)
            .offset(offset)
            .map {
                AiUsageItem(
                    id = it[AiUsageLogTable.id],
                    scene = it[AiUsageLogTable.scene],
                    provider = it[AiUsageLogTable.provider],
                    userId = it[AiUsageLogTable.userId],
                    success = it[AiUsageLogTable.success],
                    promptChars = it[AiUsageLogTable.promptChars],
                    replyChars = it[AiUsageLogTable.replyChars],
                    latencyMs = it[AiUsageLogTable.latencyMs],
                    createTime = it[AiUsageLogTable.createTime],
                )
            }
        return PageResult.of(total, (offset / limit + 1).toInt(), limit, rows)
    }

    fun usageSummary(): AiUsageSummary {
        val rows = AiUsageLogTable.select(
            AiUsageLogTable.scene,
            AiUsageLogTable.success,
            AiUsageLogTable.latencyMs,
        ).toList()
        val total = rows.size.toLong()
        val latencySum = rows.sumOf { it[AiUsageLogTable.latencyMs].toLong() }
        return AiUsageSummary(
            totalCalls = total,
            interviewCalls = rows.count { it[AiUsageLogTable.scene] == "interview" }.toLong(),
            supportCalls = rows.count { it[AiUsageLogTable.scene] == "support" }.toLong(),
            failedCalls = rows.count { !it[AiUsageLogTable.success] }.toLong(),
            avgLatencyMs = if (total == 0L) 0 else latencySum / total,
        )
    }
}
