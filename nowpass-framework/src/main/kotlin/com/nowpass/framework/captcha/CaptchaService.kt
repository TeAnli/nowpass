package com.nowpass.framework.captcha

import cn.hutool.captcha.LineCaptcha
import com.nowpass.common.constant.CacheKeys
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * 图形验证码服务。
 *
 * 设计取舍：
 * - 答案存 Redis（2 分钟、一次性），服务端无状态，多实例部署天然可用
 * - 校验即删除：无论对错都消费掉，防止同一张图被反复试探
 * - 登录 / 注册 / 找回密码三处固定出现（不做"失败 N 次才出现"的动态插入，
 *   那会让前端表单结构随状态变化，复杂且易错）
 */
@Service
class CaptchaService(
    private val redis: StringRedisTemplate,
) {

    fun generate(): CaptchaResponse {
        val uuid = UUID.randomUUID().toString().replace("-", "")
        val generator = ArithmeticGenerator()

        val captcha = LineCaptcha(WIDTH, HEIGHT, CODE_COUNT, LINE_COUNT)
        captcha.generator = generator
        captcha.createCode()

        redis.opsForValue().set(
            CacheKeys.captcha(uuid),
            generator.answer,
            TTL_SECONDS,
            TimeUnit.SECONDS,
        )
        return CaptchaResponse(uuid = uuid, img = captcha.imageBase64Data)
    }

    /**
     * 校验并消费验证码。失败抛 [ServiceException]。
     */
    fun verify(uuid: String?, code: String?) {
        if (uuid.isNullOrBlank() || code.isNullOrBlank()) {
            throw ServiceException(ErrorCode.CAPTCHA_REQUIRED)
        }
        val key = CacheKeys.captcha(uuid)
        val expected = redis.opsForValue().get(key)
        redis.delete(key)
        if (expected == null) {
            throw ServiceException(ErrorCode.CAPTCHA_ERROR, "验证码已失效，请点击图片刷新")
        }
        if (!expected.equals(code.trim(), ignoreCase = true)) {
            throw ServiceException(ErrorCode.CAPTCHA_ERROR)
        }
    }

    companion object {
        private const val WIDTH = 140
        private const val HEIGHT = 48
        private const val CODE_COUNT = 4
        private const val LINE_COUNT = 30
        private const val TTL_SECONDS = 120L
    }
}
