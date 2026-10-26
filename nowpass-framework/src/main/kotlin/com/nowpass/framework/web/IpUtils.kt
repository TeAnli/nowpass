package com.nowpass.framework.web

import jakarta.servlet.http.HttpServletRequest

/**
 * 客户端 IP 提取。
 *
 * 依次尝试常见反代头，最后回落到 `remoteAddr`。注意：这些头可被伪造，
 * 只用它们做限流维度与日志记录，**不要用于任何鉴权判断**。
 */
object IpUtils {

    private val PROXY_HEADERS = listOf(
        "X-Forwarded-For",
        "X-Real-IP",
        "Proxy-Client-IP",
        "WL-Proxy-Client-IP",
        "HTTP_CLIENT_IP",
        "HTTP_X_FORWARDED_FOR",
    )

    private const val UNKNOWN = "unknown"

    fun getClientIp(request: HttpServletRequest): String {
        for (header in PROXY_HEADERS) {
            val value = request.getHeader(header)
            if (!value.isNullOrBlank() && !UNKNOWN.equals(value, ignoreCase = true)) {
                // X-Forwarded-For 可能是逗号分隔的链路，取第一个非 unknown
                return value.split(',')
                    .map { it.trim() }
                    .firstOrNull { it.isNotEmpty() && !UNKNOWN.equals(it, ignoreCase = true) }
                    ?: UNKNOWN
            }
        }
        return request.remoteAddr ?: UNKNOWN
    }
}
