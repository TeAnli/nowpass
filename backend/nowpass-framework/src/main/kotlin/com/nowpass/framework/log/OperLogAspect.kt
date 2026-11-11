package com.nowpass.framework.log

import com.fasterxml.jackson.databind.ObjectMapper
import com.nowpass.common.annotation.Log
import com.nowpass.common.enums.BusinessType
import com.nowpass.system.domain.model.OperLogRecord
import com.nowpass.system.service.OperLogService
import com.nowpass.framework.security.SecurityUtils
import com.nowpass.framework.web.IpUtils
import org.aspectj.lang.ProceedingJoinPoint
import org.aspectj.lang.annotation.Around
import org.aspectj.lang.annotation.Aspect
import org.aspectj.lang.reflect.MethodSignature
import org.slf4j.LoggerFactory
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.context.request.RequestContextHolder
import org.springframework.web.context.request.ServletRequestAttributes

/**
 * `@Log` 切面：把管理端写操作落库到 `sys_oper_log`。
 *
 * 三条硬规则：
 * 1. **记录日志本身绝不影响主流程**：任何异常都吞掉并记 warn。
 * 2. 参数与结果都截断，避免把大段 Markdown 题干写进日志表。
 * 3. 日志走 `REQUIRES_NEW` 独立事务（见 `OperLogService.record`），
 *    业务回滚时失败日志依然保留。
 */
@Aspect
@Component
@Order(10)
class OperLogAspect(
    private val operLogService: OperLogService,
    private val objectMapper: ObjectMapper,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Around("@annotation(com.nowpass.common.annotation.Log)")
    fun around(joinPoint: ProceedingJoinPoint): Any? {
        val signature = joinPoint.signature as MethodSignature
        val annotation = signature.method.getAnnotation(Log::class.java)
            ?: return joinPoint.proceed()

        val startedAt = System.currentTimeMillis()
        var failure: Throwable? = null
        var result: Any? = null
        try {
            result = joinPoint.proceed()
            return result
        } catch (t: Throwable) {
            failure = t
            throw t
        } finally {
            runCatching {
                record(
                    joinPoint = joinPoint,
                    signature = signature,
                    annotation = annotation,
                    costTime = System.currentTimeMillis() - startedAt,
                    result = result,
                    failure = failure,
                )
            }.onFailure { log.warn("操作日志记录失败（已忽略）", it) }
        }
    }

    private fun record(
        joinPoint: ProceedingJoinPoint,
        signature: MethodSignature,
        annotation: Log,
        costTime: Long,
        result: Any?,
        failure: Throwable?,
    ) {
        val attributes = RequestContextHolder.getRequestAttributes() as? ServletRequestAttributes
        val request = attributes?.request

        val operParam = if (annotation.saveParam) {
            truncate(
                joinPoint.args.joinToString(", ") { argument ->
                    when (argument) {
                        null -> "null"
                        is String -> argument
                        else -> runCatching { objectMapper.writeValueAsString(argument) }.getOrDefault(argument.toString())
                    }
                },
            )
        } else {
            null
        }

        val jsonResult = if (annotation.saveResult) {
            truncate(runCatching { objectMapper.writeValueAsString(result) }.getOrNull())
        } else {
            null
        }

        operLogService.record(
            OperLogRecord(
                title = annotation.title,
                businessType = annotation.businessType.name,
                method = "${signature.declaringTypeName}.${signature.name}",
                requestMethod = request?.method,
                operName = SecurityUtils.currentUserOrNull()?.username ?: "anonymous",
                operUrl = request?.requestURI,
                operIp = request?.let { IpUtils.getClientIp(it) },
                operParam = operParam,
                jsonResult = jsonResult,
                status = if (failure == null) STATUS_SUCCESS else STATUS_FAIL,
                errorMsg = failure?.let { truncate(it.message ?: it.javaClass.simpleName) },
                costTime = costTime,
            ),
        )
    }

    private fun truncate(value: String?, max: Int = MAX_TEXT): String? =
        when {
            value == null -> null
            value.length <= max -> value
            else -> value.take(max) + "...(truncated)"
        }

    companion object {
        private const val MAX_TEXT = 2000
        private const val STATUS_SUCCESS = "success"
        private const val STATUS_FAIL = "fail"

        /** 供 Controller 层引用，避免拼写漂移 */
        const val DEFAULT_BUSINESS_TYPE_LABEL = "OTHER"
    }
}
