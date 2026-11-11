package com.nowpass.system.domain.query

import com.nowpass.common.response.PageQuery

/**
 * 视频列表查询。tag 过滤在 DAO 内做内存过滤（视频规模 < 200）。
 */
class VideoPageQuery : PageQuery() {
    var categoryId: Long? = null
    var keyword: String? = null
    var tag: String? = null
    var status: String? = null
}
