package com.nowpass.framework.video

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.system.domain.dao.VideoCategoryDao
import com.nowpass.system.domain.model.VideoCategory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 视频分类服务。
 */
@Service
@Transactional
class VideoCategoryService(
    private val videoCategoryDao: VideoCategoryDao,
) {

    @Transactional(readOnly = true)
    fun list(): List<VideoCategory> = videoCategoryDao.listWithCount()

    fun create(name: String, sort: Int): Long {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) throw ServiceException(ErrorCode.BAD_REQUEST, "分类名称不能为空")
        if (videoCategoryDao.existsName(trimmed)) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "分类已存在：$trimmed")
        }
        return videoCategoryDao.insert(trimmed, sort)
    }

    fun update(id: Long, name: String, sort: Int) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) throw ServiceException(ErrorCode.BAD_REQUEST, "分类名称不能为空")
        if (videoCategoryDao.existsName(trimmed, excludeId = id)) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "分类已存在：$trimmed")
        }
        if (videoCategoryDao.update(id, trimmed, sort) == 0) {
            throw ServiceException(ErrorCode.NOT_FOUND, "分类不存在")
        }
    }

    fun delete(id: Long) {
        val count = videoCategoryDao.countVideos(id)
        if (count > 0) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "该分类下还有 $count 个视频，无法删除")
        }
        if (videoCategoryDao.softDelete(id) == 0) {
            throw ServiceException(ErrorCode.NOT_FOUND, "分类不存在")
        }
    }
}
