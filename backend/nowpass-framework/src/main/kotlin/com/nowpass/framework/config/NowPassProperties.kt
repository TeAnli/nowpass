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
    var interview: Interview = Interview()
    var tts: Tts = Tts()

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

    class Interview {
        /** 是否启用真实大模型；未配置 apiKey 时自动降级为本地模拟面试官 */
        var enabled: Boolean = true

        /** OpenAI 兼容接口地址，例如 https://api.deepseek.com/v1 */
        var baseUrl: String = "https://api.openai.com/v1"

        var apiKey: String = ""
        var model: String = "gpt-4o-mini"
        var temperature: Double = 0.6
        var maxHistory: Int = 20
    }

    /**
     * 阿里云智能语音交互（NLS）语音合成配置。
     *
     * AccessKey 只用于后端换取临时 Token，绝不下发前端。
     */
    class Tts {
        var enabled: Boolean = false
        var accessKeyId: String = ""
        var accessKeySecret: String = ""
        var appKey: String = ""
        var region: String = "cn-shanghai"
        var voice: String = "zhixiaoxia"
        var format: String = "mp3"
        var sampleRate: Int = 16000
        var speechRate: Int = 0
        var pitchRate: Int = 0
        var volume: Int = 50
        var maxChars: Int = 300

        val configured: Boolean
            get() = enabled &&
                accessKeyId.isNotBlank() &&
                accessKeySecret.isNotBlank() &&
                appKey.isNotBlank()
    }
}
