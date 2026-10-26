package com.nowpass.system.service

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.dao.QuestionCategoryDao
import com.nowpass.system.domain.dao.QuestionDao
import com.nowpass.system.domain.model.QuestionAnswer
import com.nowpass.system.domain.model.QuestionDetail
import com.nowpass.system.domain.model.QuestionListItem
import com.nowpass.system.domain.model.QuestionUpsertCommand
import com.nowpass.system.domain.query.QuestionPageQuery
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 题库领域服务。
 */
@Service
@Transactional
class QuestionService(
    private val questionDao: QuestionDao,
    private val questionCategoryDao: QuestionCategoryDao,
) {

    @Transactional(readOnly = true)
    fun page(query: QuestionPageQuery): PageResult<QuestionListItem> = questionDao.page(query)

    fun detail(id: Long): QuestionDetail =
        questionDao.findDetail(id) ?: throw ServiceException(ErrorCode.NOT_FOUND, "题目不存在")

    /** 用户端详情：读取成功后才累计浏览量，后台编辑详情不应污染热门排序。 */
    fun detailAndCountView(id: Long): QuestionDetail {
        val detail = detail(id)
        questionDao.incrementViewCount(id)
        return detail
    }

    @Transactional(readOnly = true)
    fun answer(id: Long): QuestionAnswer =
        questionDao.findAnswer(id) ?: throw ServiceException(ErrorCode.NOT_FOUND, "题目不存在")

    fun create(command: QuestionUpsertCommand, operator: String): Long {
        requireCategory(command)
        validateChoice(command)
        return questionDao.insert(command, operator)
    }

    fun update(id: Long, command: QuestionUpsertCommand, operator: String) {
        requireCategory(command)
        validateChoice(command)
        val affected = questionDao.update(id, command, operator)
        if (affected == 0) throw ServiceException(ErrorCode.NOT_FOUND, "题目不存在")
    }

    fun delete(id: Long, operator: String) {
        val affected = questionDao.softDelete(id, operator)
        if (affected == 0) throw ServiceException(ErrorCode.NOT_FOUND, "题目不存在")
    }

    @Transactional(readOnly = true)
    fun countAll(): Long = questionDao.countAll()

    private fun requireCategory(command: QuestionUpsertCommand) {
        val categoryId = command.categoryId
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "分类不能为空")
        if (questionCategoryDao.findById(categoryId) == null) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "分类不存在：$categoryId")
        }
    }

    /**
     * 选择题必须同时提供选项与答案键，简答题必须两者都不提供——
     * 否则前端渲染与判分会互相矛盾。
     */
    private fun validateChoice(command: QuestionUpsertCommand) {
        val options = command.options
        val answerKey = command.answerKey
        if (options.isNullOrEmpty() && answerKey.isNullOrBlank()) return

        if (options.isNullOrEmpty()) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "提供了答案键就必须提供选项")
        }
        if (answerKey.isNullOrBlank()) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "提供了选项就必须提供答案键")
        }
        val validKeys = options.map { it.key.uppercase() }
        val unknown = answerKey.uppercase().filter { ch -> validKeys.none { key -> key == ch.toString() } }
        if (unknown.isNotEmpty()) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "答案键不在选项范围内：$unknown")
        }
    }
}
