package com.nowpass.framework.mail

import com.nowpass.common.constant.CacheKeys
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.util.concurrent.TimeUnit

/**
 * 邮箱验证码：下发与校验。
 *
 * 6 位数字、5 分钟、一次性；校验无论成败都删除，避免同一验证码被反复试探。
 */
@Service
class EmailCodeService(
    private val redis: StringRedisTemplate,
    private val emailService: EmailService,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun send(scene: EmailScene, email: String) {
        val code = (100000..999999).random().toString()
        redis.opsForValue().set(
            CacheKeys.emailCode(scene.key, email),
            code,
            TTL_MINUTES,
            TimeUnit.MINUTES,
        )
        val content = """
            <p>你的验证码是：<b style="font-size:20px">$code</b></p>
            <p>${TTL_MINUTES} 分钟内有效，仅可使用一次。</p>
            <p>如果这不是你本人的操作，请忽略本邮件。</p>
        """.trimIndent()
        try {
            emailService.send(to = email, subject = scene.subject, content = content)
        } catch (e: Exception) {
            log.error("验证码邮件发送失败：email={}, scene={}", email, scene.key, e)
            // 发送失败就作废验证码，避免用户拿不到码却占着一个有效码
            redis.delete(CacheKeys.emailCode(scene.key, email))
            throw ServiceException(ErrorCode.EMAIL_SEND_FAILED)
        }
    }

    fun verifyAndConsume(scene: EmailScene, email: String, code: String?) {
        if (code.isNullOrBlank()) {
            throw ServiceException(ErrorCode.EMAIL_CODE_REQUIRED)
        }
        val key = CacheKeys.emailCode(scene.key, email)
        val expected = redis.opsForValue().get(key)
        redis.delete(key)
        if (expected == null) {
            throw ServiceException(ErrorCode.EMAIL_CODE_ERROR, "验证码已失效，请重新获取")
        }
        if (expected != code.trim()) {
            throw ServiceException(ErrorCode.EMAIL_CODE_ERROR)
        }
    }

    companion object {
        private const val TTL_MINUTES = 5L
    }
}
