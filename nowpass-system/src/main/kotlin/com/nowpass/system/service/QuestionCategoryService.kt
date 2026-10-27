package com.nowpass.system.service

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.system.domain.dao.QuestionCategoryDao
import com.nowpass.system.domain.model.QuestionCategory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 题目分类服务。
 */
@Service
@Transactional
class QuestionCategoryService(
    private val questionCategoryDao: QuestionCategoryDao,
) {

    @Transactional(readOnly = true)
    fun list(): List<QuestionCategory> = questionCategoryDao.listWithCount()

    fun create(name: String, icon: String?, sort: Int): Long {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) throw ServiceException(ErrorCode.BAD_REQUEST, "分类名称不能为空")
        if (questionCategoryDao.existsName(trimmed)) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "分类已存在：$trimmed")
        }
        return questionCategoryDao.insert(trimmed, icon?.trim()?.takeIf { it.isNotEmpty() }, sort)
    }

    fun update(id: Long, name: String, icon: String?, sort: Int) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) throw ServiceException(ErrorCode.BAD_REQUEST, "分类名称不能为空")
        if (questionCategoryDao.existsName(trimmed, excludeId = id)) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "分类已存在：$trimmed")
        }
        val affected = questionCategoryDao.update(id, trimmed, icon?.trim()?.takeIf { it.isNotEmpty() }, sort)
        if (affected == 0) throw ServiceException(ErrorCode.NOT_FOUND, "分类不存在")
    }

    /**
     * 删除前校验：分类下仍有题目时拒绝删除。
     * 不做级联软删——那会让题库"悄悄少题"，是最难排查的一类问题。
     */
    fun delete(id: Long) {
        val questionCount = questionCategoryDao.countQuestions(id)
        if (questionCount > 0) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "该分类下还有 $questionCount 道题，无法删除")
        }
        val affected = questionCategoryDao.softDelete(id)
        if (affected == 0) throw ServiceException(ErrorCode.NOT_FOUND, "分类不存在")
    }
}
