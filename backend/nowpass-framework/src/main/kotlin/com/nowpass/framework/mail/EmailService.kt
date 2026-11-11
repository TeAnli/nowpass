package com.nowpass.framework.mail

/**
 * 邮件发送能力。
 *
 * 两种实现按 `nowpass.mail.enabled` 装配：
 * - `true`  -> [SmtpEmailService]，走真实 SMTP
 * - `false` -> [NoopEmailService]，只写日志（本地联调无需 SMTP 也能跑通全流程）
 */
interface EmailService {
    fun send(to: String, subject: String, content: String)
}
