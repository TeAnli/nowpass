package com.nowpass.common.response

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min

/**
 * 分页响应体（字段 `rows` / `total`，另附当前页码与页容量）。
 */
data class PageResult<T>(
    val total: Long,
    val page: Int,
    val pageSize: Int,
    val rows: List<T>,
) {
    companion object {
        fun <T> of(total: Long, page: Int, pageSize: Int, rows: List<T>): PageResult<T> =
            PageResult(total = total, page = page, pageSize = pageSize, rows = rows)

        fun <T> empty(page: Int, pageSize: Int): PageResult<T> =
            PageResult(total = 0L, page = page, pageSize = pageSize, rows = emptyList())
    }
}

/**
 * 分页请求参数基类。
 *
 * 用 JavaBean 风格的 `var` + 默认值，而不是构造器参数：Spring 的 `@ModelAttribute`
 * 在 Kotlin 构造器绑定上并不可靠，而查询参数绑定必须稳定。
 *
 * 页码从 1 开始，页容量上限 200 防止一次拉爆。
 */
open class PageQuery {

    @get:Min(1L)
    var page: Int = DEFAULT_PAGE
        set(value) {
            field = value.coerceAtLeast(1)
        }

    @get:Min(1L)
    @get:Max(MAX_PAGE_SIZE.toLong())
    var pageSize: Int = DEFAULT_PAGE_SIZE
        set(value) {
            field = value.coerceIn(1, MAX_PAGE_SIZE)
        }

    /** 供 Exposed 使用的 offset */
    val offset: Long
        get() = (page - 1).toLong() * pageSize

    companion object {
        const val DEFAULT_PAGE = 1
        const val DEFAULT_PAGE_SIZE = 10
        const val MAX_PAGE_SIZE = 200
    }
}
