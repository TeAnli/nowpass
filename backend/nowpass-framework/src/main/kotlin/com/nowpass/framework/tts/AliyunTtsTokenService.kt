package com.nowpass.framework.tts

import com.fasterxml.jackson.databind.JsonNode
import com.nowpass.common.constant.CacheKeys
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.framework.config.NowPassProperties
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientResponseException
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Base64
import java.util.TreeMap
import java.util.UUID
import java.util.concurrent.TimeUnit
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * 阿里云智能语音交互临时 Token。
 *
 * AccessKey 只在服务端用于换取短期 Token，Token 缓存到 Redis，绝不下发前端或写日志。
 */
@Service
class AliyunTtsTokenService(
    private val properties: NowPassProperties,
    private val redis: StringRedisTemplate,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()
    private val restClient = RestClient.builder()
        .requestFactory(JdkClientHttpRequestFactory(httpClient).apply { setReadTimeout(Duration.ofSeconds(10)) })
        .build()

    @Synchronized
    fun currentToken(): String {
        val tts = properties.tts
        if (!tts.configured) throw ServiceException(ErrorCode.NOT_IMPLEMENTED, "语音合成未配置")
        val cacheKey = CacheKeys.ttsAliyunToken(tts.region)
        redis.opsForValue().get(cacheKey)?.takeIf { it.isNotBlank() }?.let { return it }

        val token = fetchToken(tts)
        val expireAt = token.second
        val ttl = (expireAt - Instant.now().epochSecond - 300).coerceAtLeast(60)
        redis.opsForValue().set(cacheKey, token.first, ttl, TimeUnit.SECONDS)
        return token.first
    }

    private fun fetchToken(tts: NowPassProperties.Tts): Pair<String, Long> {
        val endpoint = "https://nls-meta.${tts.region}.aliyuncs.com/"
        val parameters = TreeMap<String, String>()
        parameters["AccessKeyId"] = tts.accessKeyId
        parameters["Action"] = "CreateToken"
        parameters["Version"] = "2019-02-28"
        parameters["RegionId"] = tts.region
        parameters["Format"] = "JSON"
        parameters["SignatureMethod"] = "HMAC-SHA1"
        parameters["SignatureVersion"] = "1.0"
        parameters["SignatureNonce"] = UUID.randomUUID().toString()
        parameters["Timestamp"] = Instant.now().truncatedTo(ChronoUnit.SECONDS).toString()

        val canonicalQuery = parameters.entries.joinToString("&") { (key, value) ->
            "${encode(key)}=${encode(value)}"
        }
        val stringToSign = "GET&${encode("/")}&${encode(canonicalQuery)}"
        val mac = Mac.getInstance("HmacSHA1")
        mac.init(SecretKeySpec((tts.accessKeySecret + "&").toByteArray(StandardCharsets.UTF_8), "HmacSHA1"))
        val signature = Base64.getEncoder().encodeToString(
            mac.doFinal(stringToSign.toByteArray(StandardCharsets.UTF_8)),
        )
        val url = "$endpoint?$canonicalQuery&Signature=${encode(signature)}"

        val response = try {
            // 必须用 URI.create 传入已编码的地址：RestClient.uri(String) 会把它当模板再编码一次，
            // 导致 %3A 变成 %253A，阿里云会返回 InvalidTimeStamp.Format。
            restClient.get().uri(URI.create(url)).retrieve().body(JsonNode::class.java)
        } catch (exception: RestClientResponseException) {
            log.warn(
                "阿里云 TTS Token 获取失败：status={}, body={}",
                exception.statusCode.value(),
                exception.responseBodyAsString.take(500),
            )
            throw ServiceException(ErrorCode.BAD_REQUEST, "语音服务暂时不可用")
        } catch (exception: Exception) {
            log.warn("阿里云 TTS Token 请求异常：{}", exception.javaClass.simpleName)
            throw ServiceException(ErrorCode.BAD_REQUEST, "语音服务暂时不可用")
        }
        val token = response?.path("Token")?.path("Id")?.asText("").orEmpty()
        val expireAt = response?.path("Token")?.path("ExpireTime")?.asLong(0) ?: 0
        if (token.isBlank() || expireAt <= 0) {
            log.warn("阿里云 TTS Token 响应缺少 Token 或 ExpireTime")
            throw ServiceException(ErrorCode.BAD_REQUEST, "语音服务凭证无效")
        }
        return token to expireAt
    }

    private fun encode(value: String): String =
        URLEncoder.encode(value, StandardCharsets.UTF_8)
            .replace("+", "%20")
            .replace("*", "%2A")
            .replace("%7E", "~")
}
