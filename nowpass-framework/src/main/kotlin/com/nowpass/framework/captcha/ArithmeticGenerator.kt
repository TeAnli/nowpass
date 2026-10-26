package com.nowpass.framework.captcha

import cn.hutool.captcha.generator.CodeGenerator

/**
 * 算术验证码生成器。
 *
 * 为什么自己实现而不用 hutool 自带的 `MathGenerator`：
 * 本站的校验是**无状态**的（答案存 Redis，验证时不在内存里持有 Captcha 实例），
 * 因此生成时必须把答案暴露出来单独存。
 */
class ArithmeticGenerator : CodeGenerator {

    var answer: String = ""
        private set

    override fun generate(): String {
        val operator = OPERATORS.random()
        val left: Int
        val right: Int
        val result: Int
        when (operator) {
            '-' -> {
                left = (5..9).random()
                right = (1..left).random()
                result = left - right
            }
            '*' -> {
                left = (2..9).random()
                right = (2..9).random()
                result = left * right
            }
            else -> {
                left = (1..9).random()
                right = (1..9).random()
                result = left + right
            }
        }
        answer = result.toString()
        return "$left $operator $right = ?"
    }

    override fun verify(code: String?, userInputCode: String?): Boolean = userInputCode?.trim() == answer

    companion object {
        private val OPERATORS = charArrayOf('+', '-', '*')
    }
}
