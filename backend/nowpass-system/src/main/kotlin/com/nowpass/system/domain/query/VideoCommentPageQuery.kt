package com.nowpass.system.domain.query

import com.nowpass.common.response.PageQuery

/**
 * 评论分页：默认 20 条，服务层再限制上限。
 */
class VideoCommentPageQuery : PageQuery() {
    init {
        pageSize = 20
    }
}
