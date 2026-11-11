package com.nowpass.common.enums

/**
 * 操作日志的业务类型。
 */
enum class BusinessType(val code: Int, val label: String) {
    OTHER(0, "其它"),
    INSERT(1, "新增"),
    UPDATE(2, "修改"),
    DELETE(3, "删除"),
    GRANT(4, "授权"),
    EXPORT(5, "导出"),
    IMPORT(6, "导入"),
    FORCE(7, "强退"),
    GENCODE(8, "生成代码"),
    CLEAN(9, "清空数据"),
    LOGIN(10, "登录"),
    LOGOUT(11, "登出"),
    REGISTER(12, "注册"),
    RESET_PASSWORD(13, "重置密码"),
}
