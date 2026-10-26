package com.nowpass.framework.security

import com.fasterxml.jackson.databind.ObjectMapper
import com.nowpass.common.constant.CacheKeys
import com.nowpass.framework.config.NowPassProperties
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ScanOptions
import org.springframework.stereotype.Service
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * 有状态 token：UUID 存 Redis，随请求头 `Authorization: Bearer <tokenId>` 传递。
 *
 * 与 JWT 的取舍：
 * - 优点：可即时撤销、可枚举在线用户、可做强制下线、可滑动续期
 * - 代价：每个请求一次 Redis 往返（同机约 0.1~0.3ms），且 Redis 成为可用性依赖
 */
@Service
class TokenService(
    private val redis: StringRedisTemplate,
    private val objectMapper: ObjectMapper,
    private val properties: NowPassProperties,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    fun create(
        userId: Long,
        username: String,
        nickname: String,
        email: String,
        roles: List<String>,
        permissions: List<String>,
        loginIp: String,
    ): LoginUser {
        val now = System.currentTimeMillis()
        val loginUser = LoginUser(
            tokenId = UUID.randomUUID().toString().replace("-", ""),
            userId = userId,
            username = username,
            nickname = nickname,
            email = email,
            roles = roles,
            permissions = permissions,
            loginIp = loginIp,
            loginTime = now,
            expireAt = now + TimeUnit.MINUTES.toMillis(properties.token.expireMinutes),
        )
        save(loginUser)
        return loginUser
    }

    fun load(tokenId: String): LoginUser? {
        val json = redis.opsForValue().get(CacheKeys.loginToken(tokenId)) ?: return null
        return runCatching { objectMapper.readValue(json, LoginUser::class.java) }
            .onFailure { log.warn("登录态反序列化失败，已清理 token={}", tokenId, it) }
            .getOrNull()
    }

    /**
     * 滑动续期：剩余有效期低于阈值时刷新 TTL 并回写过期时间。
     * 返回 null 表示无需续期。
     */
    fun refreshIfNeeded(loginUser: LoginUser): LoginUser? {
        val now = System.currentTimeMillis()
        val threshold = TimeUnit.MINUTES.toMillis(properties.token.refreshThresholdMinutes)
        if (loginUser.expireAt - now > threshold) return null

        val refreshed = loginUser.copy(
            expireAt = now + TimeUnit.MINUTES.toMillis(properties.token.expireMinutes),
        )
        save(refreshed)
        return refreshed
    }

    fun remove(tokenId: String) {
        redis.delete(CacheKeys.loginToken(tokenId))
    }

    /** 清理某用户全部会话：停用、改密、删除用户时调用 */
    fun removeByUserId(userId: Long): Int {
        val tokens = listOnline().filter { it.userId == userId }
        tokens.forEach { remove(it.tokenId) }
        return tokens.size
    }

    fun listOnline(): List<LoginUser> {
        val pattern = CacheKeys.LOGIN_TOKEN_PREFIX + "*"
        val options = ScanOptions.scanOptions().match(pattern).count(200).build()
        val result = mutableListOf<LoginUser>()
        redis.scan(options).use { cursor ->
            cursor.forEach { key ->
                val json = redis.opsForValue().get(key) ?: return@forEach
                runCatching { objectMapper.readValue(json, LoginUser::class.java) }
                    .onSuccess { result.add(it) }
            }
        }
        return result.sortedByDescending { it.loginTime }
    }

    fun exists(tokenId: String): Boolean =
        redis.hasKey(CacheKeys.loginToken(tokenId))

    private fun save(loginUser: LoginUser) {
        val remaining = loginUser.expireAt - System.currentTimeMillis()
        if (remaining <= 0) return
        redis.opsForValue().set(
            CacheKeys.loginToken(loginUser.tokenId),
            objectMapper.writeValueAsString(loginUser),
            remaining,
            TimeUnit.MILLISECONDS,
        )
    }
}
