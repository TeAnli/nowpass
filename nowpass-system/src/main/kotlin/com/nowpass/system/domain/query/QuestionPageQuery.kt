package com.nowpass.system.domain.query

import com.nowpass.common.response.PageQuery

/**
 * 题库列表查询条件。
 */
class QuestionPageQuery : PageQuery() {
    var categoryId: Long? = null

    /** easy / medium / hard */
    var difficulty: String? = null

    /** 标题模糊匹配 */
    var keyword: String? = null

    /** 单个标签精确匹配 */
    var tag: String? = null
}
