package com.nowpass.framework.storage

import com.nowpass.framework.config.MinioProperties
import io.minio.BucketExistsArgs
import io.minio.GetPresignedObjectUrlArgs
import io.minio.ListObjectsArgs
import io.minio.MakeBucketArgs
import io.minio.MinioClient
import io.minio.RemoveObjectArgs
import io.minio.StatObjectArgs
import io.minio.http.Method
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.UUID
import java.util.concurrent.TimeUnit

data class StoredObject(
    val key: String,
    val size: Long,
    val lastModified: Instant?,
)

data class ObjectStat(
    val size: Long,
    val contentType: String,
)

/**
 * MinIO 访问封装。内部客户端用于管理桶/对象，公开客户端只用于签发浏览器 URL。
 */
@Service
class MediaStorageService(
    private val properties: MinioProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val internalClient: MinioClient = MinioClient.builder()
        .endpoint(properties.endpoint)
        .credentials(properties.accessKey, properties.secretKey)
        .region("us-east-1")
        .build()

    private val publicClient: MinioClient = MinioClient.builder()
        .endpoint(properties.publicEndpoint)
        .credentials(properties.accessKey, properties.secretKey)
        .region("us-east-1")
        .build()

    @Volatile
    private var bucketReady = false

    @PostConstruct
    fun ensureBucket() {
        runCatching { ensureBucketOrThrow() }
            .onFailure { log.warn("MinIO 初始化检查失败，视频功能将在存储恢复后可用：{}", it.message) }
    }

    /**
     * 上传前兜底建桶：容器启动顺序或 MinIO 短暂未就绪时，不能只依赖 @PostConstruct。
     */
    @Synchronized
    fun ensureBucketOrThrow() {
        if (bucketReady) return
        val exists = internalClient.bucketExists(
            BucketExistsArgs.builder().bucket(properties.bucket).build(),
        )
        if (!exists) {
            internalClient.makeBucket(MakeBucketArgs.builder().bucket(properties.bucket).build())
            log.info("已创建 MinIO 私有桶：{}", properties.bucket)
        }
        bucketReady = true
    }

    fun uploadTicket(videoId: Long, kind: String, contentType: String): Pair<String, String> {
        ensureBucketOrThrow()
        val extension = when {
            kind == "video" -> "mp4"
            contentType.equals("image/png", true) -> "png"
            contentType.equals("image/webp", true) -> "webp"
            else -> "jpg"
        }
        val prefix = if (kind == "video") "videos" else "covers"
        val objectKey = "$prefix/$videoId/${UUID.randomUUID()}.$extension"
        val uploadUrl = publicClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .method(Method.PUT)
                .bucket(properties.bucket)
                .`object`(objectKey)
                .expiry(properties.uploadUrlMinutes.toInt(), TimeUnit.MINUTES)
                .build(),
        )
        return uploadUrl to objectKey
    }

    fun playUrl(objectKey: String): String =
        publicClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(properties.bucket)
                .`object`(objectKey)
                .expiry(properties.playbackUrlMinutes.toInt(), TimeUnit.MINUTES)
                .build(),
        )

    fun stat(objectKey: String): ObjectStat? =
        try {
            val response = internalClient.statObject(
                StatObjectArgs.builder().bucket(properties.bucket).`object`(objectKey).build(),
            )
            ObjectStat(response.size(), response.contentType())
        } catch (exception: Exception) {
            log.debug("对象不存在或不可读：{}，{}", objectKey, exception.message)
            null
        }

    fun delete(objectKey: String) {
        try {
            internalClient.removeObject(
                RemoveObjectArgs.builder().bucket(properties.bucket).`object`(objectKey).build(),
            )
        } catch (exception: Exception) {
            log.warn("删除 MinIO 对象失败：{}，{}", objectKey, exception.message)
        }
    }

    fun listObjects(): List<StoredObject> {
        val result = internalClient.listObjects(
            ListObjectsArgs.builder().bucket(properties.bucket).recursive(true).build(),
        )
        return result.mapNotNull { itemResult ->
            try {
                val item = itemResult.get()
                StoredObject(item.objectName(), item.size(), item.lastModified()?.toInstant())
            } catch (exception: Exception) {
                log.warn("读取 MinIO 对象列表失败：{}", exception.message)
                null
            }
        }
    }
}
