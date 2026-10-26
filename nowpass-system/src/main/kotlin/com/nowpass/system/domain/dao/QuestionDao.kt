package com.nowpass.system.domain.dao

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.model.QuestionAnswer
import com.nowpass.system.domain.model.QuestionDetail
import com.nowpass.system.domain.model.QuestionListItem
import com.nowpass.system.domain.model.QuestionUpsertCommand
import com.nowpass.system.domain.query.QuestionPageQuery
import com.nowpass.system.domain.table.QuestionCategoryTable
import com.nowpass.system.domain.table.QuestionTable
import com.nowpass.system.mapper.toQuestionAnswer
import com.nowpass.system.mapper.toQuestionDetail
import com.nowpass.system.mapper.toQuestionListItem
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.TextColumnType
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.like
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.transactions.transaction
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * 题目数据访问层。
 */
@Repository
class QuestionDao {

    private val joined = QuestionTable.innerJoin(QuestionCategoryTable)

    fun page(query: QuestionPageQuery): PageResult<QuestionListItem> {
        val base = joined.select(
            QuestionTable.id,
            QuestionTable.categoryId,
            QuestionCategoryTable.name,
            QuestionTable.difficulty,
            QuestionTable.title,
            QuestionTable.tags,
            QuestionTable.createTime,
        ).where { QuestionTable.deleted eq false }

        query.categoryId?.let { categoryId ->
            base.andWhere { QuestionTable.categoryId eq categoryId }
        }
        query.difficulty?.takeIf { it.isNotBlank() }?.let { difficulty ->
            base.andWhere { QuestionTable.difficulty eq difficulty.lowercase() }
        }
        query.keyword?.takeIf { it.isNotBlank() }?.let { keyword ->
            base.andWhere { QuestionTable.title like "%$keyword%" }
        }
        query.tag?.takeIf { it.isNotBlank() }?.let { tag ->
            val ids = idsByTag(tag)
            if (ids.isEmpty()) return PageResult.empty(query.page, query.pageSize)
            base.andWhere { QuestionTable.id inList ids }
        }

        val total = base.copy().count()
        val rows = base.orderBy(QuestionTable.id to SortOrder.DESC)
            .limit(query.pageSize)
            .offset(query.offset)
            .map { it.toQuestionListItem() }

        return PageResult.of(total, query.page, query.pageSize, rows)
    }

    fun findDetail(id: Long): QuestionDetail? =
        joined.select(
            QuestionTable.id,
            QuestionTable.categoryId,
            QuestionCategoryTable.name,
            QuestionTable.difficulty,
            QuestionTable.title,
            QuestionTable.contentMd,
            QuestionTable.optionJson,
            QuestionTable.tags,
            QuestionTable.createTime,
        )
            .where { (QuestionTable.id eq id) and (QuestionTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.toQuestionDetail()

    fun findAnswer(id: Long): QuestionAnswer? =
        QuestionTable.select(QuestionTable.id, QuestionTable.answerMd, QuestionTable.answerKey)
            .where { (QuestionTable.id eq id) and (QuestionTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.toQuestionAnswer()

    fun insert(command: QuestionUpsertCommand, operator: String): Long =
        QuestionTable.insert {
            it[QuestionTable.categoryId] = command.categoryId!!
            it[QuestionTable.difficulty] = command.difficulty.lowercase()
            it[QuestionTable.title] = command.title.trim()
            it[QuestionTable.contentMd] = command.contentMd
            it[QuestionTable.answerMd] = command.answerMd
            it[QuestionTable.optionJson] = command.options
            it[QuestionTable.answerKey] = command.answerKey
            it[QuestionTable.tags] = command.tags
            it[QuestionTable.createBy] = operator
            it[QuestionTable.createTime] = OffsetDateTime.now()
        } get QuestionTable.id

    fun update(id: Long, command: QuestionUpsertCommand, operator: String): Int =
        QuestionTable.update({ (QuestionTable.id eq id) and (QuestionTable.deleted eq false) }) {
            it[QuestionTable.categoryId] = command.categoryId!!
            it[QuestionTable.difficulty] = command.difficulty.lowercase()
            it[QuestionTable.title] = command.title.trim()
            it[QuestionTable.contentMd] = command.contentMd
            it[QuestionTable.answerMd] = command.answerMd
            it[QuestionTable.optionJson] = command.options
            it[QuestionTable.answerKey] = command.answerKey
            it[QuestionTable.tags] = command.tags
            it[QuestionTable.updateBy] = operator
            it[QuestionTable.updateTime] = OffsetDateTime.now()
        }

    fun softDelete(id: Long, operator: String): Int =
        QuestionTable.update({ (QuestionTable.id eq id) and (QuestionTable.deleted eq false) }) {
            it[QuestionTable.deleted] = true
            it[QuestionTable.updateBy] = operator
            it[QuestionTable.updateTime] = OffsetDateTime.now()
        }

    fun countAll(): Long =
        QuestionTable.select(QuestionTable.id)
            .where { QuestionTable.deleted eq false }
            .count()

    fun existsCategory(categoryId: Long): Boolean =
        QuestionTable.select(QuestionTable.id)
            .where { (QuestionTable.categoryId eq categoryId) and (QuestionTable.deleted eq false) }
            .limit(1)
            .any()

    /**
     * 标签筛选：PostgreSQL 数组的包含运算符 `@>`，Exposed 没有对应 DSL，
     * 因此先取 id 集合再交给上层做 `inList`（标签用 GIN 索引，代价很低）。
     */
    private fun idsByTag(tag: String): List<Long> = transaction {
        exec(
            "select id from question where deleted = false and tags @> array[?]::text[]",
            listOf(TextColumnType() to tag),
        ) { rs ->
            buildList {
                while (rs.next()) add(rs.getLong(1))
            }
        } ?: emptyList()
    }
}
