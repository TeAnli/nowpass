package com.nowpass.common.constant

/**
 * Redis 键前缀。集中管理，避免各处硬编码字符串互相踩。
 */
object CacheKeys {

    /** 登录会话：login_tokens:{tokenId} -> LoginUser(JSON) */
    const val LOGIN_TOKEN_PREFIX = "login_tokens:"

    /** 图形验证码：captcha:{uuid} -> "答案:过期时间戳" */
    const val CAPTCHA_PREFIX = "captcha:"

    /** 限流计数：rate_limit:{scene}:{dimension} */
    const val RATE_LIMIT_PREFIX = "rate_limit:"

    /** 登录失败计数：pwd_retry:{username} -> 次数 */
    const val PWD_RETRY_PREFIX = "pwd_retry:"

    /** 账号锁定标记：pwd_lock:{username} */
    const val PWD_LOCK_PREFIX = "pwd_lock:"

    /** 邮箱验证码：email_code:{scene}:{email} -> 验证码 */
    const val EMAIL_CODE_PREFIX = "email_code:"

    /** QQ OAuth state：oauth:qq:state:{state} */
    const val OAUTH_QQ_STATE_PREFIX = "oauth:qq:state:"

    /** QQ 一次性登录票据：oauth:qq:ticket:{ticket} -> tokenId */
    const val OAUTH_QQ_TICKET_PREFIX = "oauth:qq:ticket:"

    /** 阿里云 TTS 临时 Token：tts:aliyun:token:{region} */
    const val TTS_ALIYUN_TOKEN_PREFIX = "tts:aliyun:token:"

    fun loginToken(tokenId: String): String = LOGIN_TOKEN_PREFIX + tokenId

    fun captcha(uuid: String): String = CAPTCHA_PREFIX + uuid

    fun rateLimit(scene: String, dimension: String): String = "$RATE_LIMIT_PREFIX$scene:$dimension"

    fun pwdRetry(username: String): String = PWD_RETRY_PREFIX + username

    fun pwdLock(username: String): String = PWD_LOCK_PREFIX + username

    fun emailCode(scene: String, email: String): String = "$EMAIL_CODE_PREFIX$scene:$email"

    fun oauthQqState(state: String): String = OAUTH_QQ_STATE_PREFIX + state

    fun oauthQqTicket(ticket: String): String = OAUTH_QQ_TICKET_PREFIX + ticket

    fun ttsAliyunToken(region: String): String = TTS_ALIYUN_TOKEN_PREFIX + region
}
