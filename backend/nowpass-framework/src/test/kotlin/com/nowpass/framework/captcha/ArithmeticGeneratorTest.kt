package com.nowpass.framework.captcha

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ArithmeticGeneratorTest {

    private val pattern = Regex("""^(\d+) ([+\-*]) (\d+) = \?$""")

    @Test
    fun `生成结果符合算式格式`() {
        val generator = ArithmeticGenerator()
        repeat(100) {
            val code = generator.generate()
            assertTrue(pattern.matches(code), "格式不符：$code")
        }
    }

    @Test
    fun `答案与算式一致`() {
        repeat(100) {
            val generator = ArithmeticGenerator()
            val code = generator.generate()
            val match = pattern.find(code) ?: error("无法解析：$code")
            val (left, operator, right) = match.destructured
            val expected = when (operator) {
                "+" -> left.toInt() + right.toInt()
                "-" -> left.toInt() - right.toInt()
                else -> left.toInt() * right.toInt()
            }
            assertEquals(expected.toString(), generator.answer, "算式 $code 的答案错误")
        }
    }

    @Test
    fun `减法不会出现负数`() {
        repeat(100) {
            val generator = ArithmeticGenerator()
            val code = generator.generate()
            if (code.contains("-")) {
                assertTrue(generator.answer.toInt() >= 0, "减法出现负数：$code = ${generator.answer}")
            }
        }
    }

    @Test
    fun `校验时忽略首尾空格`() {
        val generator = ArithmeticGenerator()
        generator.generate()
        assertTrue(generator.verify(generator.answer, "  ${generator.answer}  "))
        assertFalse(generator.verify(generator.answer, "${generator.answer}9"))
        assertFalse(generator.verify(generator.answer, null))
    }
}
