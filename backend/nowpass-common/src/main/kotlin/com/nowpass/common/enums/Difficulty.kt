package com.nowpass.common.enums

/**
 * 题目难度。
 */
enum class Difficulty {
    EASY,
    MEDIUM,
    HARD;

    companion object {
        fun of(value: String?): Difficulty? =
            entries.firstOrNull { it.name.equals(value, ignoreCase = true) }
    }
}
