package com.nowpass.common.response

import com.nowpass.common.exception.ErrorCode

/**
 * 统一响应结构。
 *
 * 字段为 `code/msg/data`：`code` 为 200 表示成功，其余取值见 [com.nowpass.common.exception.ErrorCode]；
 * `data` 为 null 时会被省略（全局 non_null 序列化策略）。
 */
data class R<T>(
    val code: Int,
    val msg: String,
    val data: T? = null,
) {
    val success: Boolean
        get() = code == ErrorCode.SUCCESS.code

    companion object {
        fun <T> ok(data: T? = null): R<T> = R(ErrorCode.SUCCESS.code, ErrorCode.SUCCESS.message, data)

        fun <T> ok(msg: String, data: T? = null): R<T> = R(ErrorCode.SUCCESS.code, msg, data)

        fun <T> fail(errorCode: ErrorCode): R<T> = R(errorCode.code, errorCode.message, null)

        fun <T> fail(errorCode: ErrorCode, msg: String): R<T> = R(errorCode.code, msg, null)

        fun <T> fail(code: Int, msg: String): R<T> = R(code, msg, null)
    }
}
