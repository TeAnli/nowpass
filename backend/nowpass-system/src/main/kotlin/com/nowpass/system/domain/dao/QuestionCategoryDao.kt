package com.nowpass.system.domain.dao

import com.nowpass.system.domain.model.QuestionCategory
import com.nowpass.system.domain.table.QuestionCategoryTable
import com.nowpass.system.domain.table.QuestionMajorCategoryTable
import com.nowpass.system.domain.table.QuestionTable
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.count
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.neq
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * 题目分类数据访问层。
 */
@Repository
class QuestionCategoryDao {

    fun listWithCount(): List<QuestionCategory> {
        val questionCount = QuestionTable.id.count()
        val counts = QuestionTable.select(QuestionTable.categoryId, questionCount)
            .where { QuestionTable.deleted eq false }
            .groupBy(QuestionTable.categoryId)
            .associate { it[QuestionTable.categoryId] to it[questionCount] }
        val majorById = QuestionMajorCategoryTable.select(
            QuestionMajorCategoryTable.id,
            QuestionMajorCategoryTable.name,
            QuestionMajorCategoryTable.sort,
        )
            .where { QuestionMajorCategoryTable.deleted eq false }
            .associateBy({ it[QuestionMajorCategoryTable.id] }) {
                it[QuestionMajorCategoryTable.name] to it[QuestionMajorCategoryTable.sort]
            }

        return QuestionCategoryTable.select(
            QuestionCategoryTable.id,
            QuestionCategoryTable.name,
            QuestionCategoryTable.icon,
            QuestionCategoryTable.sort,
            QuestionCategoryTable.majorCategoryId,
        )
            .where { QuestionCategoryTable.deleted eq false }
            .orderBy(QuestionCategoryTable.sort to SortOrder.ASC)
            .map { row ->
                val id = row[QuestionCategoryTable.id]
                val majorId = row[QuestionCategoryTable.majorCategoryId]
                val major = majorId?.let { majorById[it] }
                QuestionCategory(
                    id = id,
                    name = row[QuestionCategoryTable.name],
                    icon = row[QuestionCategoryTable.icon],
                    sort = row[QuestionCategoryTable.sort],
                    questionCount = counts[id] ?: 0L,
                    majorCategoryId = majorId,
                    majorCategoryName = major?.first,
                    majorCategorySort = major?.second,
                )
            }
    }

    fun findById(id: Long): QuestionCategory? =
        QuestionCategoryTable.select(
            QuestionCategoryTable.id,
            QuestionCategoryTable.name,
            QuestionCategoryTable.icon,
            QuestionCategoryTable.sort,
        )
            .where { (QuestionCategoryTable.id eq id) and (QuestionCategoryTable.deleted eq false) }
            .limit(1)
            .firstOrNull()
            ?.let {
                QuestionCategory(
                    id = it[QuestionCategoryTable.id],
                    name = it[QuestionCategoryTable.name],
                    icon = it[QuestionCategoryTable.icon],
                    sort = it[QuestionCategoryTable.sort],
                )
            }

    fun existsName(name: String, excludeId: Long? = null): Boolean {
        val base = QuestionCategoryTable.select(QuestionCategoryTable.id)
            .where { (QuestionCategoryTable.name eq name) and (QuestionCategoryTable.deleted eq false) }
        excludeId?.let { id -> base.andWhere { QuestionCategoryTable.id neq id } }
        return base.limit(1).any()
    }

    fun insert(name: String, icon: String?, sort: Int): Long =
        QuestionCategoryTable.insert {
            it[QuestionCategoryTable.name] = name
            it[QuestionCategoryTable.icon] = icon
            it[QuestionCategoryTable.sort] = sort
            it[QuestionCategoryTable.createTime] = OffsetDateTime.now()
        } get QuestionCategoryTable.id

    fun update(id: Long, name: String, icon: String?, sort: Int): Int =
        QuestionCategoryTable.update({ (QuestionCategoryTable.id eq id) and (QuestionCategoryTable.deleted eq false) }) {
            it[QuestionCategoryTable.name] = name
            it[QuestionCategoryTable.icon] = icon
            it[QuestionCategoryTable.sort] = sort
            it[QuestionCategoryTable.updateTime] = OffsetDateTime.now()
        }

    fun softDelete(id: Long): Int =
        QuestionCategoryTable.update({ (QuestionCategoryTable.id eq id) and (QuestionCategoryTable.deleted eq false) }) {
            it[QuestionCategoryTable.deleted] = true
            it[QuestionCategoryTable.updateTime] = OffsetDateTime.now()
        }

    fun countQuestions(categoryId: Long): Long =
        QuestionTable.select(QuestionTable.id)
            .where { (QuestionTable.categoryId eq categoryId) and (QuestionTable.deleted eq false) }
            .count()
}
