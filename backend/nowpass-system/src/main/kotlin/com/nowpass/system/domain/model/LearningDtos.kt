package com.nowpass.system.domain.model

import java.time.OffsetDateTime

data class FavoriteItem(
    val questionId: Long,
    val title: String,
    val categoryName: String?,
    val difficulty: String,
    val createTime: OffsetDateTime,
)

data class ProgressItem(
    val questionId: Long,
    val title: String,
    val categoryName: String?,
    val difficulty: String,
    val viewCount: Int,
    val answerRevealed: Boolean,
    val selfRating: String?,
    val lastViewAt: OffsetDateTime,
)

data class LearningSummary(
    val favoriteCount: Long,
    val viewedCount: Long,
    val knownCount: Long,
    val unsureCount: Long,
    val unknownCount: Long,
    val interviewCount: Long,
)

data class ProgressCommand(
    val answerRevealed: Boolean? = null,
    val selfRating: String? = null,
)

data class InterviewSessionItem(
    val id: Long,
    val questionId: Long,
    val questionTitle: String,
    val provider: String?,
    val messageCount: Int,
    val startedAt: OffsetDateTime,
    val endedAt: OffsetDateTime?,
    val hasReport: Boolean,
)

data class InterviewSessionDetail(
    val session: InterviewSessionItem,
    val reportMd: String?,
    val messages: List<InterviewHistoryMessage>,
)

data class InterviewHistoryMessage(
    val role: String,
    val content: String,
    val createTime: OffsetDateTime,
)

data class InterviewSessionCreate(
    val questionId: Long,
    val questionTitle: String,
    val provider: String?,
)

data class InterviewMessageAppend(
    val role: String,
    val content: String,
)

data class InterviewTurnAppend(
    val userContent: String? = null,
    val assistantContent: String,
    val provider: String? = null,
)

data class InterviewFinishCommand(
    val reportMd: String? = null,
)

data class FavoriteCommand(
    val questionId: Long,
)

data class FavoriteState(
    val questionId: Long,
    val favorite: Boolean,
)
