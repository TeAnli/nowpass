package com.nowpass.framework.mail

import com.nowpass.framework.config.NowPassProperties
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

/**
 * 真实 SMTP 发送。
 *
 * 注意：`spring.mail.properties.mail.smtp.*timeout` 必须配置（见 application.yml），
 * 默认无限超时会在 SMTP 不可达时把请求线程长期挂死。
 */
@Service
@ConditionalOnProperty(prefix = "nowpass.mail", name = ["enabled"], havingValue = "true")
class SmtpEmailService(
    private val mailSender: JavaMailSender,
    private val properties: NowPassProperties,
) : EmailService {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun send(to: String, subject: String, content: String) {
        val message = mailSender.createMimeMessage()
        val helper = MimeMessageHelper(message, false, "UTF-8")
        helper.setFrom(properties.mail.from)
        helper.setTo(to)
        helper.setSubject(subject)
        helper.setText(content, true)
        mailSender.send(message)
        log.info("邮件已发送：to={}, subject={}", to, subject)
    }
}
