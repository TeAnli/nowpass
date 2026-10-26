package com.nowpass.framework.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

/**
 * `nowpass.*` 自定义配置。
 *
 * 用可变属性而非构造器绑定：`@ConfigurationProperties` 的 setter 绑定最稳，
 * 且配置项在测试里可以直接赋值。
 */
@Component
@ConfigurationProperties(prefix = "nowpass")
class NowPassProperties {

    var token: Token = Token()
    var mail: Mail = Mail()
    var register: Register = Register()
    var login: Login = Login()
    var init: Init = Init()

    class Token {
        /** token 有效期（分钟） */
        var expireMinutes: Long = 120

        /** 剩余有效期低于该值时自动续期（分钟） */
        var refreshThresholdMinutes: Long = 60
    }

    class Mail {
        /** 是否启用真实邮件发送；关闭时验证码写入日志（仅开发用） */
        var enabled: Boolean = false
        var from: String = "NowPass <no-reply@nowpass.local>"
    }

    class Register {
        /** true：注册后为 pending，需管理员审批；false：注册即 active */
        var requireApproval: Boolean = true
    }

    class Login {
        /** 连续失败多少次后锁定 */
        var maxRetry: Int = 5

        /** 锁定时长（分钟） */
        var lockMinutes: Long = 15
    }

    class Init {
        /** 启动时若不存在则创建该超级管理员 */
        var adminUsername: String = "admin"
        var adminPassword: String = "Admin@123456"
        var adminNickname: String = "超级管理员"
        var adminEmail: String = "admin@nowpass.local"
    }
}
