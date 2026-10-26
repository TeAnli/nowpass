package com.nowpass.framework.ratelimit

import com.nowpass.common.annotation.RateLimiter
import com.nowpass.common.constant.CacheKeys
import com.nowpass.common.enums.LimitType
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
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
 * `@RateLimiter` 切面。
 *
 * 只应加在敏感端点上（登录 / 注册 / 发验证码 / 找回密码）：
 * 全站限流会让正常翻页也可能被误伤，而真正的风险面就是暴力猜密码与刷验证码邮件。
 */
@Aspect
@Component
@Order(1)
class RateLimiterAspect(
    private val redisRateLimiter: RedisRateLimiter,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Around("@annotation(com.nowpass.common.annotation.RateLimiter)")
    fun around(joinPoint: ProceedingJoinPoint): Any? {
        val signature = joinPoint.signature as MethodSignature
        val annotation = signature.method.getAnnotation(RateLimiter::class.java)
            ?: return joinPoint.proceed()

        val scene = annotation.key.ifBlank {
            "${signature.declaringType.simpleName}.${signature.name}"
        }

        val ip = currentIp()
        val username = SecurityUtils.currentUserOrNull()?.username ?: ip
        val dimensions = when (annotation.limitType) {
            LimitType.IP -> listOf("ip:$ip")
            LimitType.USER -> listOf("user:$username")
            LimitType.IP_AND_USER -> listOf("ip:$ip", "user:$username")
        }

        val denied = dimensions.any { dimension ->
            !redisRateLimiter.tryAcquire(
                key = CacheKeys.rateLimit(scene, dimension),
                windowSeconds = annotation.time,
                limit = annotation.count,
            )
        }

        if (denied) {
            log.warn("触发限流：scene={}, dimensions={}", scene, dimensions)
            throw ServiceException(ErrorCode.RATE_LIMITED)
        }
        return joinPoint.proceed()
    }

    private fun currentIp(): String {
        val attributes = RequestContextHolder.getRequestAttributes() as? ServletRequestAttributes
        return attributes?.request?.let { IpUtils.getClientIp(it) } ?: "unknown"
    }
}
