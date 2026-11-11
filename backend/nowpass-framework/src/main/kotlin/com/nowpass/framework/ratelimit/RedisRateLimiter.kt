package com.nowpass.framework.ratelimit

import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.stereotype.Service
import java.util.concurrent.TimeUnit

/**
 * 基于 Redis 的固定窗口限流。
 *
 * 用 Lua 保证 `INCR` 与首次 `EXPIRE` 的原子性：否则并发下可能出现
 * "计数器已 +1 但过期时间没设置"，导致键永不过期、接口被永久限流。
 */
@Service
class RedisRateLimiter(
    private val redis: StringRedisTemplate,
) {

    private val script = DefaultRedisScript(LUA_SCRIPT, Long::class.java)

    fun tryAcquire(key: String, windowSeconds: Long, limit: Int): Boolean =
        increment(key, windowSeconds) <= limit

    /** 原子自增并保证首次设置过期时间，返回自增后的值 */
    fun increment(key: String, windowSeconds: Long): Long =
        redis.execute(script, listOf(key), windowSeconds.toString()) ?: 0L

    /** 读取当前计数，仅用于测试与排查 */
    fun currentCount(key: String): Long =
        redis.opsForValue().get(key)?.toLongOrNull() ?: 0L

    /** 手动清除计数（例如登录成功后清失败次数） */
    fun reset(key: String) {
        redis.delete(key)
    }

    /** 设置一个带 TTL 的标记（用于账号锁定） */
    fun mark(key: String, ttlMinutes: Long) {
        redis.opsForValue().set(key, "1", ttlMinutes, TimeUnit.MINUTES)
    }

    fun isMarked(key: String): Boolean = redis.hasKey(key)

    companion object {
        private const val LUA_SCRIPT = """
            local current = redis.call('incr', KEYS[1])
            if tonumber(current) == 1 then
                redis.call('expire', KEYS[1], ARGV[1])
            end
            return current
        """
    }
}
