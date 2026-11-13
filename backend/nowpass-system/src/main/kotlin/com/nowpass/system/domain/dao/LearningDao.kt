package com.nowpass.system.domain.dao

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.model.FavoriteItem
import com.nowpass.system.domain.model.LearningSummary
import com.nowpass.system.domain.model.ProgressItem
import com.nowpass.system.domain.table.QuestionCategoryTable
import com.nowpass.system.domain.table.QuestionTable
import com.nowpass.system.domain.table.UserFavoriteTable
import com.nowpass.system.domain.table.UserQuestionProgressTable
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.update
import org.jetbrains.exposed.v1.jdbc.upsert
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * 收藏与刷题记录的数据访问层。
 */
@Repository
class LearningDao {

    private val favoriteJoin = UserFavoriteTable
        .innerJoin(QuestionTable)
        .innerJoin(QuestionCategoryTable)

    private val progressJoin = UserQuestionProgressTable
        .innerJoin(QuestionTable)
        .innerJoin(QuestionCategoryTable)

    // ---------------- 收藏 ----------------

    fun isFavorite(userId: Long, questionId: Long): Boolean =
        UserFavoriteTable.select(UserFavoriteTable.questionId)
            .where { (UserFavoriteTable.userId eq userId) and (UserFavoriteTable.questionId eq questionId) }
            .limit(1)
            .any()

    fun addFavorite(userId: Long, questionId: Long) {
        UserFavoriteTable.insert {
            it[UserFavoriteTable.userId] = userId
            it[UserFavoriteTable.questionId] = questionId
            it[createTime] = OffsetDateTime.now()
        }
    }

    fun removeFavorite(userId: Long, questionId: Long): Int =
        UserFavoriteTable.deleteWhere {
            (UserFavoriteTable.userId eq userId) and (UserFavoriteTable.questionId eq questionId)
        }

    fun favoritePage(userId: Long, offset: Long, limit: Int): PageResult<FavoriteItem> {
        val base = favoriteJoin.select(
            UserFavoriteTable.questionId,
            QuestionTable.title,
            QuestionCategoryTable.name,
            QuestionTable.difficulty,
            UserFavoriteTable.createTime,
        ).where {
            (UserFavoriteTable.userId eq userId) and (QuestionTable.deleted eq false)
        }
        val total = base.copy().count()
        val rows = base
            .orderBy(UserFavoriteTable.createTime to SortOrder.DESC)
            .limit(limit)
            .offset(offset)
            .map(::toFavorite)
        return PageResult.of(total, (offset / limit + 1).toInt(), limit, rows)
    }

    fun favoriteIds(userId: Long, limit: Int = 500): List<Long> =
        UserFavoriteTable.select(UserFavoriteTable.questionId)
            .where { UserFavoriteTable.userId eq userId }
            .orderBy(UserFavoriteTable.createTime to SortOrder.DESC)
            .limit(limit)
            .map { it[UserFavoriteTable.questionId] }

    // ---------------- 刷题记录 ----------------

    fun touchProgress(userId: Long, questionId: Long, answerRevealed: Boolean?, selfRating: String?) {
        val existing = UserQuestionProgressTable.select(
            UserQuestionProgressTable.viewCount,
            UserQuestionProgressTable.answerRevealed,
            UserQuestionProgressTable.selfRating,
        )
            .where {
                (UserQuestionProgressTable.userId eq userId) and
                    (UserQuestionProgressTable.questionId eq questionId)
            }
            .limit(1)
            .firstOrNull()

        val now = OffsetDateTime.now()
        if (existing == null) {
            UserQuestionProgressTable.insert {
                it[UserQuestionProgressTable.userId] = userId
                it[UserQuestionProgressTable.questionId] = questionId
                it[viewCount] = 1
                it[UserQuestionProgressTable.answerRevealed] = answerRevealed ?: false
                it[UserQuestionProgressTable.selfRating] = selfRating
                it[lastViewAt] = now
                it[createTime] = now
            }
            return
        }

        UserQuestionProgressTable.update({
            (UserQuestionProgressTable.userId eq userId) and
                (UserQuestionProgressTable.questionId eq questionId)
        }) {
            it[viewCount] = existing[UserQuestionProgressTable.viewCount] + 1
            it[UserQuestionProgressTable.answerRevealed] =
                answerRevealed ?: existing[UserQuestionProgressTable.answerRevealed]
            it[UserQuestionProgressTable.selfRating] = selfRating ?: existing[UserQuestionProgressTable.selfRating]
            it[lastViewAt] = now
        }
    }

    fun progressPage(userId: Long, offset: Long, limit: Int): PageResult<ProgressItem> {
        val base = progressJoin.select(
            UserQuestionProgressTable.questionId,
            QuestionTable.title,
            QuestionCategoryTable.name,
            QuestionTable.difficulty,
            UserQuestionProgressTable.viewCount,
            UserQuestionProgressTable.answerRevealed,
            UserQuestionProgressTable.selfRating,
            UserQuestionProgressTable.lastViewAt,
        ).where {
            (UserQuestionProgressTable.userId eq userId) and (QuestionTable.deleted eq false)
        }
        val total = base.copy().count()
        val rows = base
            .orderBy(UserQuestionProgressTable.lastViewAt to SortOrder.DESC)
            .limit(limit)
            .offset(offset)
            .map(::toProgress)
        return PageResult.of(total, (offset / limit + 1).toInt(), limit, rows)
    }

    fun summary(userId: Long): LearningSummary {
        val favoriteCount = UserFavoriteTable.select(UserFavoriteTable.questionId)
            .where { UserFavoriteTable.userId eq userId }
            .count()
        val progressRows = UserQuestionProgressTable.select(
            UserQuestionProgressTable.questionId,
            UserQuestionProgressTable.selfRating,
        )
            .where { UserQuestionProgressTable.userId eq userId }
            .toList()
        return LearningSummary(
            favoriteCount = favoriteCount,
            viewedCount = progressRows.size.toLong(),
            knownCount = progressRows.count { it[UserQuestionProgressTable.selfRating] == "known" }.toLong(),
            unsureCount = progressRows.count { it[UserQuestionProgressTable.selfRating] == "unsure" }.toLong(),
            unknownCount = progressRows.count { it[UserQuestionProgressTable.selfRating] == "unknown" }.toLong(),
            interviewCount = 0,
        )
    }

    private fun toFavorite(row: ResultRow): FavoriteItem =
        FavoriteItem(
            questionId = row[UserFavoriteTable.questionId],
            title = row[QuestionTable.title],
            categoryName = row[QuestionCategoryTable.name],
            difficulty = row[QuestionTable.difficulty],
            createTime = row[UserFavoriteTable.createTime],
        )

    private fun toProgress(row: ResultRow): ProgressItem =
        ProgressItem(
            questionId = row[UserQuestionProgressTable.questionId],
            title = row[QuestionTable.title],
            categoryName = row[QuestionCategoryTable.name],
            difficulty = row[QuestionTable.difficulty],
            viewCount = row[UserQuestionProgressTable.viewCount],
            answerRevealed = row[UserQuestionProgressTable.answerRevealed],
            selfRating = row[UserQuestionProgressTable.selfRating],
            lastViewAt = row[UserQuestionProgressTable.lastViewAt],
        )
}
