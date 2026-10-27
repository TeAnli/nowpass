package com.nowpass.framework.interview

import com.nowpass.framework.config.NowPassProperties
import com.nowpass.system.service.QuestionService
import org.slf4j.LoggerFactory
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import java.net.http.HttpClient
import java.time.Duration

/**
 * AI 面试官。
 *
 * 真实模型走 OpenAI 兼容的 `/chat/completions`，可以接 OpenAI、DeepSeek、通义等；
 * 没有配置 apiKey 或调用失败时，降级为本地模拟面试官，保证页面不空白。
 */
@Service
class AiInterviewService(
    private val questionService: QuestionService,
    private val properties: NowPassProperties,
) {
    private val log = LoggerFactory.getLogger(javaClass)
    private val httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()
    private val requestFactory = JdkClientHttpRequestFactory(httpClient).apply {
        setReadTimeout(Duration.ofSeconds(30))
    }
    private val restClient = RestClient.builder().requestFactory(requestFactory).build()

    fun chat(questionId: Long, history: List<InterviewMessage>): InterviewChatResponse {
        val question = questionService.detail(questionId)
        val answer = questionService.answer(questionId)
        val safeHistory = history
            .takeLast(properties.interview.maxHistory)
            .filter { it.role == "user" || it.role == "assistant" }
            .map { it.copy(content = it.content.take(4000)) }

        if (!properties.interview.enabled || properties.interview.apiKey.isBlank()) {
            return localReply(question.title, question.contentMd, answer.answerMd, safeHistory, questionId, "local")
        }

        val systemPrompt = """
            你是 NowPass 的中文技术面试官。你在进行一次一对一面试。
            规则：
            1. 一次只问一个问题，问题要具体、可回答，不要一次抛出多个问题。
            2. 先让候选人回答，再指出其回答中的遗漏或模糊点；不要一开始直接念标准答案。
            3. 语气专业、简洁、有耐心，可以追问边界条件、取舍和失败场景。
            4. 候选人明显不会时给一个提示，而不是直接长篇输出答案。
            5. 回复控制在 120~220 字，只输出面试官回复，不要输出分析过程。

            当前题目：${question.title}
            题干：${question.contentMd.take(1600)}
            标准答案（仅供你评估，不要整段照读）：${answer.answerMd.take(2400)}
        """.trimIndent()

        val body = mapOf(
            "model" to properties.interview.model,
            "temperature" to properties.interview.temperature,
            "messages" to buildList {
                add(mapOf("role" to "system", "content" to systemPrompt))
                safeHistory.forEach { add(mapOf("role" to it.role, "content" to it.content)) }
            },
        )

        return try {
            val response = restClient.post()
                .uri(properties.interview.baseUrl.trimEnd('/') + "/chat/completions")
                .header("Authorization", "Bearer ${properties.interview.apiKey}")
                .header("Content-Type", "application/json")
                .body(body)
                .retrieve()
                .body(com.fasterxml.jackson.databind.JsonNode::class.java)
            val reply = response?.path("choices")?.path(0)?.path("message")?.path("content")?.asText("").orEmpty()
            if (reply.isBlank()) {
                localReply(question.title, question.contentMd, answer.answerMd, safeHistory, questionId, "local-fallback")
            } else {
                InterviewChatResponse(reply.trim(), "openai", questionId)
            }
        } catch (exception: Exception) {
            log.warn("AI 面试接口调用失败，降级本地模式：{}", exception.message)
            localReply(question.title, question.contentMd, answer.answerMd, safeHistory, questionId, "local-fallback")
        }
    }

    private fun localReply(
        title: String,
        content: String,
        answer: String,
        history: List<InterviewMessage>,
        questionId: Long,
        provider: String,
    ): InterviewChatResponse {
        val last = history.lastOrNull { it.role == "user" }?.content?.trim().orEmpty()
        val answerHint = answer
            .replace(Regex("[#*`>\\-]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
            .take(180)
        val reply = if (last.isBlank()) {
            "我们开始吧。先看这道题：「$title」。你能先用自己的话讲一遍你的理解吗？不用追求完整，我会根据你的回答继续追问。"
        } else if (last.length < 20) {
            "你的回答有点短。可以补充一下关键概念、适用场景和边界条件吗？如果暂时没有思路，也可以告诉我你卡在哪一步。"
        } else {
            "我记下了。你提到的内容里，我会继续追问一个容易忽略的点：如果把它放到真实生产环境，最容易出问题的边界是什么？参考方向：$answerHint"
        }
        return InterviewChatResponse(reply, provider, questionId)
    }
}
