package com.nowpass.system.domain.dao

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.model.InterviewHistoryMessage
import com.nowpass.system.domain.model.InterviewSessionCreate
import com.nowpass.system.domain.model.InterviewSessionDetail
import com.nowpass.system.domain.model.InterviewSessionItem
import com.nowpass.system.domain.model.InterviewMessageAppend
import com.nowpass.system.domain.table.InterviewMessageTable
import com.nowpass.system.domain.table.InterviewSessionTable
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * AI 面试历史数据访问层。
 */
@Repository
class InterviewHistoryDao {

    fun createSession(userId: Long, command: InterviewSessionCreate): Long =
        InterviewSessionTable.insert {
            it[InterviewSessionTable.userId] = userId
            it[questionId] = command.questionId
            it[questionTitle] = command.questionTitle.take(200)
            it[provider] = command.provider
            it[startedAt] = OffsetDateTime.now()
        } get InterviewSessionTable.id

    fun appendMessage(sessionId: Long, message: InterviewMessageAppend) {
        InterviewMessageTable.insert {
            it[InterviewMessageTable.sessionId] = sessionId
            it[role] = message.role
            it[content] = message.content
            it[createTime] = OffsetDateTime.now()
        }
        val current = InterviewSessionTable.select(InterviewSessionTable.messageCount)
            .where { InterviewSessionTable.id eq sessionId }
            .limit(1)
            .firstOrNull()
            ?.get(InterviewSessionTable.messageCount) ?: 0
        InterviewSessionTable.update({ InterviewSessionTable.id eq sessionId }) {
            it[messageCount] = current + 1
        }
    }

    fun finishSession(sessionId: Long, userId: Long, reportMd: String?) {
        InterviewSessionTable.update({
            (InterviewSessionTable.id eq sessionId) and (InterviewSessionTable.userId eq userId)
        }) {
            it[endedAt] = OffsetDateTime.now()
            if (reportMd != null) it[InterviewSessionTable.reportMd] = reportMd
        }
    }

    fun updateProvider(sessionId: Long, userId: Long, provider: String) {
        InterviewSessionTable.update({
            (InterviewSessionTable.id eq sessionId) and (InterviewSessionTable.userId eq userId)
        }) {
            it[InterviewSessionTable.provider] = provider
        }
    }

    fun page(userId: Long, offset: Long, limit: Int): PageResult<InterviewSessionItem> {
        val base = InterviewSessionTable.select(
            InterviewSessionTable.id,
            InterviewSessionTable.questionId,
            InterviewSessionTable.questionTitle,
            InterviewSessionTable.provider,
            InterviewSessionTable.messageCount,
            InterviewSessionTable.startedAt,
            InterviewSessionTable.endedAt,
            InterviewSessionTable.reportMd,
        ).where { InterviewSessionTable.userId eq userId }
        val total = base.copy().count()
        val rows = base
            .orderBy(InterviewSessionTable.startedAt to SortOrder.DESC)
            .limit(limit)
            .offset(offset)
            .map(::toItem)
        return PageResult.of(total, (offset / limit + 1).toInt(), limit, rows)
    }

    fun detail(sessionId: Long, userId: Long): InterviewSessionDetail? {
        val sessionRow = InterviewSessionTable.select(
            InterviewSessionTable.id,
            InterviewSessionTable.questionId,
            InterviewSessionTable.questionTitle,
            InterviewSessionTable.provider,
            InterviewSessionTable.messageCount,
            InterviewSessionTable.startedAt,
            InterviewSessionTable.endedAt,
            InterviewSessionTable.reportMd,
        )
            .where {
                (InterviewSessionTable.id eq sessionId) and (InterviewSessionTable.userId eq userId)
            }
            .limit(1)
            .firstOrNull() ?: return null

        val messages = InterviewMessageTable.select(
            InterviewMessageTable.role,
            InterviewMessageTable.content,
            InterviewMessageTable.createTime,
        )
            .where { InterviewMessageTable.sessionId eq sessionId }
            .orderBy(InterviewMessageTable.id to SortOrder.ASC)
            .map {
                InterviewHistoryMessage(
                    role = it[InterviewMessageTable.role],
                    content = it[InterviewMessageTable.content],
                    createTime = it[InterviewMessageTable.createTime],
                )
            }

        return InterviewSessionDetail(
            session = toItem(sessionRow),
            reportMd = sessionRow[InterviewSessionTable.reportMd],
            messages = messages,
        )
    }

    fun countByUser(userId: Long): Long =
        InterviewSessionTable.select(InterviewSessionTable.id)
            .where { InterviewSessionTable.userId eq userId }
            .count()

    private fun toItem(row: org.jetbrains.exposed.v1.core.ResultRow): InterviewSessionItem =
        InterviewSessionItem(
            id = row[InterviewSessionTable.id],
            questionId = row[InterviewSessionTable.questionId],
            questionTitle = row[InterviewSessionTable.questionTitle],
            provider = row[InterviewSessionTable.provider],
            messageCount = row[InterviewSessionTable.messageCount],
            startedAt = row[InterviewSessionTable.startedAt],
            endedAt = row[InterviewSessionTable.endedAt],
            hasReport = !row[InterviewSessionTable.reportMd].isNullOrBlank(),
        )
}
