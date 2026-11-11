package com.nowpass.system.domain.model

import java.time.OffsetDateTime

/**
 * 写入操作日志的载体（由 framework 的 `OperLogAspect` 构造）。
 */
data class OperLogRecord(
    val title: String,
    val businessType: String,
    val method: String? = null,
    val requestMethod: String? = null,
    val operName: String? = null,
    val operUrl: String? = null,
    val operIp: String? = null,
    val operParam: String? = null,
    val jsonResult: String? = null,
    val status: String,
    val errorMsg: String? = null,
    val costTime: Long? = null,
)

/**
 * 日志列表项。
 */
data class OperLogItem(
    val id: Long,
    val title: String,
    val businessType: String,
    val requestMethod: String?,
    val operName: String?,
    val operUrl: String?,
    val operIp: String?,
    val status: String,
    val errorMsg: String?,
    val costTime: Long?,
    val operTime: OffsetDateTime?,
)
