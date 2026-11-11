package com.nowpass.framework.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

/**
 * QQ 互联 OAuth 配置。
 *
 * AppID/AppKey 为空时前端隐藏 QQ 登录入口；不要在代码里写死。
 */
@Component
@ConfigurationProperties(prefix = "nowpass.qq")
class QqProperties {

    var enabled: Boolean = false
    var appId: String = ""
    var appKey: String = ""

    /** 必须与 QQ 互联后台登记的回调地址完全一致 */
    var redirectUri: String = "http://127.0.0.1:8088/api/auth/qq/callback"

    /** 登录成功后浏览器跳转的前端页面 */
    var frontendRedirectUri: String = "http://127.0.0.1:8088/oauth/qq/callback"

    var stateMinutes: Long = 5
    var ticketMinutes: Long = 2

    val configured: Boolean
        get() = enabled && appId.isNotBlank() && appKey.isNotBlank()
}
