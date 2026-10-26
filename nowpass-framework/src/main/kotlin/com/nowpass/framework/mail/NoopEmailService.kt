package com.nowpass.framework.mail

import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service

/**
 * 未配置 SMTP 时的降级实现：把邮件内容（含验证码）打到日志。
 *
 * 这是**开发默认值**。生产要真正发信，必须设置 `nowpass.mail.enabled=true` 并配好
 * `spring.mail.*`；否则用户收不到验证码，注册与找回密码实际不可用。
 */
@Service
@ConditionalOnProperty(prefix = "nowpass.mail", name = ["enabled"], havingValue = "false", matchIfMissing = true)
class NoopEmailService : EmailService {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun send(to: String, subject: String, content: String) {
        log.warn(
            "邮件未真实发送（nowpass.mail.enabled=false）-> to={}, subject={}, content={}",
            to,
            subject,
            content.replace(Regex("<[^>]+>"), " ").trim(),
        )
    }
}
