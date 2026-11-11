package com.nowpass.system.domain.query

import com.nowpass.common.response.PageQuery

/**
 * 操作日志查询条件。
 */
class OperLogPageQuery : PageQuery() {
    var title: String? = null
    var operName: String? = null

    /** success / fail */
    var status: String? = null
}
