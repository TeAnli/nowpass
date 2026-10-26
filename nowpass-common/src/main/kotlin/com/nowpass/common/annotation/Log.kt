package com.nowpass.common.annotation

import com.nowpass.common.enums.BusinessType

/**
 * 操作日志注解。
 *
 * 由 `OperLogAspect` 拦截，异步落 `sys_oper_log`。
 */
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class Log(
    /** 模块标题，如「题目管理」 */
    val title: String,
    /** 业务类型 */
    val businessType: BusinessType = BusinessType.OTHER,
    /** 是否记录请求参数 */
    val saveParam: Boolean = true,
    /** 是否记录响应结果（大对象如题目详情建议关掉） */
    val saveResult: Boolean = false,
)
