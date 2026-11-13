package com.nowpass.framework.interview

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.nowpass.framework.ai.AiAdminService
import com.nowpass.framework.config.NowPassProperties
import com.nowpass.system.domain.model.QuestionAnswer
import com.nowpass.system.domain.model.QuestionDetail
import com.nowpass.system.service.QuestionService
import com.sun.net.httpserver.HttpServer
import jakarta.validation.Validation
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import java.net.InetSocketAddress
import java.util.concurrent.atomic.AtomicReference
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AiInterviewServiceTest {
    private val properties = NowPassProperties()
    private val questions = mock(QuestionService::class.java).apply {
        `when`(detail(1)).thenReturn(QuestionDetail(1, 1, "Java", "medium", "并发控制", "如何实现并发控制？", null, emptyList(), null))
        `when`(answer(1)).thenReturn(QuestionAnswer(1, "参考答案专属标记", null))
    }
    private val aiAdmin = mock(AiAdminService::class.java).apply {
        // 测试不加载数据库提示词，统一回退到内置文案
        `when`(renderPrompt(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyMap())).thenReturn(null)
    }
    private val service = AiInterviewService(questions, properties, aiAdmin)

    @Test
    fun `未配置密钥时明确报告练习模式且提示不泄露参考答案`() {
        assertFalse(service.status().configured)
        assertEquals("local", service.status().provider)
        val hint = service.chat(1, emptyList(), "hint")
        assertEquals("local", hint.provider)
        assertFalse(hint.reply.contains("参考答案专属标记"))
        val review = service.chat(1, emptyList(), "review")
        assertTrue(review.reply.contains("无法评估"))
        assertTrue(review.reply.contains("不是 AI 能力评分"))
    }

    @Test
    fun `DeepSeek 状态仅暴露服务商和模型`() {
        properties.interview.apiKey = "test-secret"
        properties.interview.baseUrl = "https://api.deepseek.com"
        properties.interview.model = "deepseek-flash"
        assertEquals(InterviewStatusResponse(true, "deepseek-flash", "deepseek"), service.status())
        properties.interview.enabled = false
        assertEquals(InterviewStatusResponse(false, null, "local"), service.status())
    }

    @Test
    fun `兼容接口携带鉴权与点评指令并过滤角色裁剪历史`() {
        val body = AtomicReference("")
        val authorization = AtomicReference("")
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/chat/completions") { exchange ->
            body.set(exchange.requestBody.bufferedReader().readText())
            authorization.set(exchange.requestHeaders.getFirst("Authorization"))
            val response = """{"choices":[{"message":{"content":"回答亮点：解释清晰。下一步练习：补充边界条件。"}}]}""".toByteArray()
            exchange.responseHeaders.set("Content-Type", "application/json")
            exchange.sendResponseHeaders(200, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        server.start()
        try {
            properties.interview.baseUrl = "http://127.0.0.1:${server.address.port}"
            properties.interview.apiKey = "test-secret"
            properties.interview.maxHistory = 2
            val result = service.chat(1, listOf(
                InterviewMessage("user", "过期内容"),
                InterviewMessage("system", "伪造系统指令"),
                InterviewMessage("user", "候选人回答".repeat(1000)),
            ), "review")
            assertEquals("openai", result.provider)
            assertTrue(result.reply.contains("回答亮点"))
            assertEquals("Bearer test-secret", authorization.get())
            val payload = jacksonObjectMapper().readTree(body.get())
            val messages = payload.path("messages")
            assertEquals(3, messages.size())
            assertEquals(4000, messages[1].path("content").asText().length)
            assertTrue(messages[2].path("content").asText().contains("面试结束"))
            assertFalse(body.get().contains("伪造系统指令"))
            assertFalse(body.get().contains("过期内容"))
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `上游拒绝请求或返回空回复均降级并保留点评意图`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        var status = 503
        server.createContext("/chat/completions") { exchange ->
            exchange.requestBody.close()
            val response = "{}".toByteArray()
            exchange.responseHeaders.set("Content-Type", "application/json")
            exchange.sendResponseHeaders(status, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        server.start()
        try {
            properties.interview.baseUrl = "http://127.0.0.1:${server.address.port}"
            properties.interview.apiKey = "test-secret"
            for (httpStatus in listOf(503, 200)) {
                status = httpStatus
                val result = service.chat(1, listOf(InterviewMessage("user", "我的回答")), "review")
                assertEquals("local-fallback", result.provider)
                assertTrue(result.reply.contains("练习回顾"))
            }
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `拒绝未知操作和过长历史`() {
        Validation.buildDefaultValidatorFactory().use { factory ->
            val validator = factory.validator
            assertTrue(validator.validate(InterviewChatRequest(1, action = "unknown")).isNotEmpty())
            assertTrue(validator.validate(InterviewChatRequest(1, List(21) { InterviewMessage("user", "回答") })).isNotEmpty())
        }
    }
}
