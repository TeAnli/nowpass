package com.nowpass.framework.video

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.PageResult
import com.nowpass.framework.config.MinioProperties
import com.nowpass.framework.storage.MediaStorageService
import com.nowpass.system.domain.dao.VideoCategoryDao
import com.nowpass.system.domain.dao.VideoDao
import com.nowpass.system.domain.model.VideoAdminItem
import com.nowpass.system.domain.model.VideoCleanupResult
import com.nowpass.system.domain.model.VideoDetail
import com.nowpass.system.domain.model.VideoListItem
import com.nowpass.system.domain.model.VideoRecord
import com.nowpass.system.domain.model.VideoUploadRequest
import com.nowpass.system.domain.model.VideoUploadTicket
import com.nowpass.system.domain.model.VideoUpsertCommand
import com.nowpass.system.domain.query.VideoPageQuery
import com.nowpass.system.service.QuestionService
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.OffsetDateTime

/**
 * 视频讲解业务：用户读取、管理员上传/发布、对象校验与清理。
 */
@Service
@Transactional
class VideoService(
    private val videoDao: VideoDao,
    private val videoCategoryDao: VideoCategoryDao,
    private val mediaStorageService: MediaStorageService,
    private val minioProperties: MinioProperties,
    private val questionService: QuestionService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional(readOnly = true)
    fun userPage(query: VideoPageQuery): PageResult<VideoListItem> {
        query.status = "published"
        val page = videoDao.page(query)
        return PageResult.of(
            page.total,
            page.page,
            page.pageSize,
            page.rows.map { toListItem(it) },
        )
    }

    @Transactional(readOnly = true)
    fun userDetail(id: Long): VideoDetail {
        val record = videoDao.findById(id, publishedOnly = true)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "视频不存在或尚未发布")
        val videoKey = record.videoObjectKey
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "视频文件尚未上传完成")
        val questionTitle = record.questionId?.let {
            runCatching { questionService.detail(it).title }.getOrNull()
        }
        return VideoDetail(
            id = record.id,
            title = record.title,
            description = record.description,
            speaker = record.speaker,
            categoryId = record.categoryId,
            categoryName = record.categoryName,
            questionId = record.questionId,
            questionTitle = questionTitle,
            tags = record.tags,
            durationSeconds = record.durationSeconds,
            coverUrl = record.coverObjectKey?.let { mediaStorageService.playUrl(it) },
            playUrl = mediaStorageService.playUrl(videoKey),
            publishedAt = record.publishedAt,
        )
    }

    @Transactional(readOnly = true)
    fun playUrl(id: Long): String {
        val record = videoDao.findById(id, publishedOnly = true)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "视频不存在或尚未发布")
        val key = record.videoObjectKey
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "视频文件尚未上传完成")
        return mediaStorageService.playUrl(key)
    }

    @Transactional(readOnly = true)
    fun publishedTags(): List<String> = videoDao.publishedTags()

    @Transactional(readOnly = true)
    fun adminPage(query: VideoPageQuery): PageResult<VideoAdminItem> {
        val page = videoDao.page(query)
        return PageResult.of(
            page.total,
            page.page,
            page.pageSize,
            page.rows.map { toAdminItem(it) },
        )
    }

    @Transactional(readOnly = true)
    fun adminDetail(id: Long): VideoAdminItem =
        toAdminItem(findOrThrow(id))

    fun create(command: VideoUpsertCommand): Long {
        validateRelations(command)
        return videoDao.insert(command)
    }

    fun update(id: Long, command: VideoUpsertCommand) {
        findOrThrow(id)
        validateRelations(command)
        if (videoDao.updateMetadata(id, command) == 0) {
            throw ServiceException(ErrorCode.NOT_FOUND, "视频不存在")
        }
    }

    fun uploadTicket(id: Long, request: VideoUploadRequest): VideoUploadTicket {
        val record = findOrThrow(id)
        val kind = request.kind.lowercase()
        if (kind != "video" && kind != "cover") {
            throw ServiceException(ErrorCode.BAD_REQUEST, "上传类型只能是 video 或 cover")
        }
        if (kind == "video" && !request.contentType.equals("video/mp4", true)) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "视频只支持 MP4（video/mp4）")
        }
        if (kind == "cover" && request.contentType.lowercase() !in setOf("image/jpeg", "image/png", "image/webp")) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "封面只支持 JPG、PNG、WebP")
        }

        val (uploadUrl, objectKey) = mediaStorageService.uploadTicket(record.id, kind, request.contentType)
        if (kind == "video") videoDao.setVideoObjectKey(id, objectKey)
        else videoDao.setCoverObjectKey(id, objectKey)
        return VideoUploadTicket(
            uploadUrl = uploadUrl,
            objectKey = objectKey,
            expiresInSeconds = minioProperties.uploadUrlMinutes * 60,
        )
    }

    fun finalize(id: Long, durationSeconds: Int) {
        val record = findOrThrow(id)
        val videoKey = record.videoObjectKey
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "请先上传视频文件")
        val videoStat = mediaStorageService.stat(videoKey)
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "未在 MinIO 找到视频文件，请重新上传")
        if (videoStat.size <= 0) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "视频文件为空")
        }
        if (videoStat.size > minioProperties.maxVideoBytes) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "视频不能超过 500MB")
        }

        record.coverObjectKey?.let { coverKey ->
            val coverStat = mediaStorageService.stat(coverKey)
                ?: throw ServiceException(ErrorCode.BAD_REQUEST, "未在 MinIO 找到封面文件，请重新上传")
            if (coverStat.size > minioProperties.maxCoverBytes) {
                throw ServiceException(ErrorCode.BAD_REQUEST, "封面不能超过 5MB")
            }
        }

        videoDao.finalize(id, videoStat.size, videoStat.contentType, durationSeconds)
    }

    fun publish(id: Long) {
        val record = findOrThrow(id)
        if (record.videoObjectKey.isNullOrBlank() || record.sizeBytes <= 0) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "视频尚未上传并确认，不能发布")
        }
        if (videoDao.publish(id) == 0) {
            throw ServiceException(ErrorCode.NOT_FOUND, "视频不存在")
        }
    }

    fun offline(id: Long) {
        findOrThrow(id)
        if (videoDao.offline(id) == 0) throw ServiceException(ErrorCode.NOT_FOUND, "视频不存在")
    }

    fun delete(id: Long) {
        findOrThrow(id)
        if (videoDao.softDelete(id) == 0) throw ServiceException(ErrorCode.NOT_FOUND, "视频不存在")
    }

    @Transactional(readOnly = true)
    fun previewUrl(id: Long): String {
        val record = findOrThrow(id)
        val key = record.videoObjectKey
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "视频文件尚未上传完成")
        return mediaStorageService.playUrl(key)
    }

    fun cleanupNow(): VideoCleanupResult {
        val cutoff = OffsetDateTime.now().minusHours(24)
        var deletedDrafts = 0
        var deletedObjects = 0

        videoDao.staleDrafts(cutoff).forEach { refs ->
            refs.videoObjectKey?.let { deleteAndCount(it) }?.let { deletedObjects += it }
            refs.coverObjectKey?.let { deleteAndCount(it) }?.let { deletedObjects += it }
            videoDao.hardDelete(refs.id)
            deletedDrafts += 1
        }

        videoDao.deletedBefore(cutoff).forEach { refs ->
            refs.videoObjectKey?.let { deleteAndCount(it) }?.let { deletedObjects += it }
            refs.coverObjectKey?.let { deleteAndCount(it) }?.let { deletedObjects += it }
            videoDao.hardDelete(refs.id)
        }

        val referenced = videoDao.allObjectKeys()
        mediaStorageService.listObjects()
            .filter { (it.key.startsWith("videos/") || it.key.startsWith("covers/")) && it.key !in referenced }
            .filter { it.lastModified == null || it.lastModified.isBefore(cutoff.toInstant()) }
            .forEach {
                mediaStorageService.delete(it.key)
                deletedObjects += 1
            }

        log.info("视频清理完成：草稿 {} 个，对象 {} 个", deletedDrafts, deletedObjects)
        return VideoCleanupResult(deletedDrafts, deletedObjects)
    }

    @Scheduled(cron = "0 30 3 * * *")
    fun scheduledCleanup() {
        runCatching { cleanupNow() }
            .onFailure { log.warn("定时清理视频对象失败：{}", it.message) }
    }

    private fun validateRelations(command: VideoUpsertCommand) {
        val categoryId = command.categoryId
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "请选择视频分类")
        if (videoCategoryDao.findById(categoryId) == null) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "视频分类不存在")
        }
        command.questionId?.let {
            runCatching { questionService.detail(it) }
                .getOrElse { throw ServiceException(ErrorCode.BAD_REQUEST, "关联题目不存在") }
        }
    }

    private fun findOrThrow(id: Long): VideoRecord =
        videoDao.findById(id) ?: throw ServiceException(ErrorCode.NOT_FOUND, "视频不存在")

    private fun toListItem(record: VideoRecord): VideoListItem =
        VideoListItem(
            id = record.id,
            title = record.title,
            speaker = record.speaker,
            categoryId = record.categoryId,
            categoryName = record.categoryName,
            tags = record.tags,
            durationSeconds = record.durationSeconds,
            coverUrl = record.coverObjectKey?.let { mediaStorageService.playUrl(it) },
            publishedAt = record.publishedAt,
        )

    private fun toAdminItem(record: VideoRecord): VideoAdminItem =
        VideoAdminItem(
            id = record.id,
            title = record.title,
            description = record.description,
            speaker = record.speaker,
            categoryId = record.categoryId,
            categoryName = record.categoryName,
            questionId = record.questionId,
            tags = record.tags,
            videoObjectKey = record.videoObjectKey,
            coverObjectKey = record.coverObjectKey,
            coverUrl = record.coverObjectKey?.let { mediaStorageService.playUrl(it) },
            durationSeconds = record.durationSeconds,
            sizeBytes = record.sizeBytes,
            contentType = record.contentType,
            status = record.status,
            publishedAt = record.publishedAt,
            createTime = record.createTime,
            updateTime = record.updateTime,
        )

    private fun deleteAndCount(key: String): Int {
        mediaStorageService.delete(key)
        return 1
    }
}

