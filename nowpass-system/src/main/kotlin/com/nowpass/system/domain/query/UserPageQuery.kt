package com.nowpass.system.domain.query

import com.nowpass.common.response.PageQuery

/**
 * 后台用户列表查询条件。
 */
class UserPageQuery : PageQuery() {
    /** 用户名 / 昵称 / 邮箱 模糊匹配 */
    var keyword: String? = null

    /** pending / active / disabled */
    var status: String? = null
}
