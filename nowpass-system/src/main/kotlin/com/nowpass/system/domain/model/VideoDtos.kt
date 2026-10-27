package com.nowpass.system.domain.model

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.OffsetDateTime

data class VideoCategory(
    val id: Long,
    val name: String,
    val sort: Int,
    val videoCount: Long = 0,
)

/**
 * 数据库行映射，服务端内部使用，包含 MinIO object key。
 */
data class VideoRecord(
    val id: Long,
    val title: String,
    val description: String?,
    val speaker: String?,
    val categoryId: Long,
    val categoryName: String?,
    val questionId: Long?,
    val tags: List<String>,
    val videoObjectKey: String?,
    val coverObjectKey: String?,
    val durationSeconds: Int,
    val sizeBytes: Long,
    val contentType: String?,
    val status: String,
    val publishedAt: OffsetDateTime?,
    val createTime: OffsetDateTime?,
    val updateTime: OffsetDateTime?,
)

data class VideoListItem(
    val id: Long,
    val title: String,
    val speaker: String?,
    val categoryId: Long,
    val categoryName: String?,
    val tags: List<String>,
    val durationSeconds: Int,
    val coverUrl: String?,
    val publishedAt: OffsetDateTime?,
)

data class VideoDetail(
    val id: Long,
    val title: String,
    val description: String?,
    val speaker: String?,
    val categoryId: Long,
    val categoryName: String?,
    val questionId: Long?,
    val questionTitle: String?,
    val tags: List<String>,
    val durationSeconds: Int,
    val coverUrl: String?,
    val playUrl: String,
    val publishedAt: OffsetDateTime?,
)

data class VideoAdminItem(
    val id: Long,
    val title: String,
    val description: String?,
    val speaker: String?,
    val categoryId: Long,
    val categoryName: String?,
    val questionId: Long?,
    val tags: List<String>,
    val videoObjectKey: String?,
    val coverObjectKey: String?,
    val coverUrl: String?,
    val durationSeconds: Int,
    val sizeBytes: Long,
    val contentType: String?,
    val status: String,
    val publishedAt: OffsetDateTime?,
    val createTime: OffsetDateTime?,
    val updateTime: OffsetDateTime?,
)

data class VideoUpsertCommand(
    @field:NotBlank(message = "视频标题不能为空")
    @field:Size(max = 200, message = "标题不能超过 200 字")
    val title: String,

    @field:Size(max = 2000, message = "简介不能超过 2000 字")
    val description: String? = null,

    @field:Size(max = 100, message = "讲师信息不能超过 100 字")
    val speaker: String? = null,

    @field:NotNull(message = "请选择视频分类")
    val categoryId: Long?,

    val questionId: Long? = null,
    val tags: List<String> = emptyList(),

    @field:Min(0, message = "时长不能为负数")
    @field:Max(10800, message = "时长不能超过 3 小时")
    val durationSeconds: Int = 0,
)

data class VideoUploadRequest(
    @field:NotBlank(message = "上传类型不能为空")
    val kind: String,

    @field:NotBlank(message = "Content-Type 不能为空")
    val contentType: String,
)

data class VideoUploadTicket(
    val uploadUrl: String,
    val objectKey: String,
    val expiresInSeconds: Long,
)

data class VideoPlayUrl(
    val url: String,
)

data class VideoFinalizeCommand(
    @field:Min(0, message = "时长不能为负数")
    @field:Max(10800, message = "时长不能超过 3 小时")
    val durationSeconds: Int = 0,
)

data class VideoCleanupResult(
    val deletedDrafts: Int,
    val deletedObjects: Int,
)

data class VideoObjectRefs(
    val id: Long,
    val videoObjectKey: String?,
    val coverObjectKey: String?,
)

