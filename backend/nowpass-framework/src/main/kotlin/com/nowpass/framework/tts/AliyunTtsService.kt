package com.nowpass.framework.tts

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.framework.config.NowPassProperties
import org.slf4j.LoggerFactory
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import org.springframework.web.util.UriComponentsBuilder
import java.net.http.HttpClient
import java.time.Duration

/**
 * 阿里云智能语音交互语音合成。
 *
 * 单次文本上限 300 字；超长内容由前端按标点切段，避免服务端拼接 MP3。
 */
@Service
class AliyunTtsService(
    private val properties: NowPassProperties,
    private val tokenService: AliyunTtsTokenService,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()
    private val restClient = RestClient.builder()
        .requestFactory(JdkClientHttpRequestFactory(httpClient).apply { setReadTimeout(Duration.ofSeconds(30)) })
        .build()

    fun status(): InterviewTtsStatusResponse =
        InterviewTtsStatusResponse(
            enabled = properties.tts.configured,
            voice = properties.tts.voice,
            maxChars = properties.tts.maxChars,
        )

    fun synthesize(text: String): ByteArray {
        val tts = properties.tts
        if (!tts.configured) throw ServiceException(ErrorCode.NOT_IMPLEMENTED, "语音合成未配置")
        val content = cleanForSpeech(text)
        if (content.isEmpty()) throw ServiceException(ErrorCode.BAD_REQUEST, "朗读文本不能为空")
        if (content.length > tts.maxChars) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "单次朗读不能超过 ${tts.maxChars} 字")
        }

        val token = tokenService.currentToken()
        val uri = UriComponentsBuilder
            .fromUriString("https://nls-gateway-${tts.region}.aliyuncs.com/stream/v1/tts")
            .queryParam("appkey", tts.appKey)
            .queryParam("token", token)
            .queryParam("text", content)
            .queryParam("format", tts.format)
            .queryParam("sample_rate", tts.sampleRate)
            .queryParam("voice", tts.voice)
            .queryParam("speech_rate", tts.speechRate)
            .queryParam("pitch_rate", tts.pitchRate)
            .queryParam("volume", tts.volume)
            .build()
            .encode()
            .toUri()

        val response = try {
            restClient.get().uri(uri).retrieve().toEntity(ByteArray::class.java)
        } catch (exception: Exception) {
            log.warn("阿里云 TTS 合成请求失败：{}", exception.javaClass.simpleName)
            throw ServiceException(ErrorCode.BAD_REQUEST, "语音合成失败，请稍后重试")
        }
        val body = response.body
        val contentType = response.headers.contentType?.toString().orEmpty()
        if (body == null || body.isEmpty() || !contentType.startsWith("audio/")) {
            log.warn("阿里云 TTS 返回异常：contentType={}, size={}", contentType, body?.size ?: 0)
            throw ServiceException(ErrorCode.BAD_REQUEST, "语音合成服务返回异常")
        }
        return body
    }

    private fun cleanForSpeech(text: String): String =
        text
            .replace(Regex("```[\\s\\S]*?```"), " ")
            .replace(Regex("https?://\\S+"), " ")
            .replace(Regex("[#*`>_~\\[\\]()]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
}
