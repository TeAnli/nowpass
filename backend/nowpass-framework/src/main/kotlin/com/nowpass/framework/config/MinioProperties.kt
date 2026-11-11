package com.nowpass.framework.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

/**
 * MinIO / S3 兼容对象存储配置。
 */
@Component
@ConfigurationProperties(prefix = "nowpass.minio")
class MinioProperties {

    /** 后端访问 MinIO 的内部地址 */
    var endpoint: String = "http://localhost:9000"

    /** 浏览器访问 MinIO 的公开地址；预签名 URL 必须使用这个地址 */
    var publicEndpoint: String = "http://127.0.0.1:9002"

    var accessKey: String = "minioadmin"
    var secretKey: String = "minioadmin"
    var bucket: String = "nowpass-media"

    /** 视频/封面预签名上传有效期（分钟） */
    var uploadUrlMinutes: Long = 15

    /** 播放预签名有效期（分钟） */
    var playbackUrlMinutes: Long = 120

    var maxVideoBytes: Long = 500L * 1024 * 1024
    var maxCoverBytes: Long = 5L * 1024 * 1024
}
