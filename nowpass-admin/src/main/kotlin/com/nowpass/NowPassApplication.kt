package com.nowpass

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

/**
 * NowPass 启动类。
 *
 * 模块依赖方向（严格单向）：admin -> framework -> system -> common
 */
@SpringBootApplication
class NowPassApplication

fun main(args: Array<String>) {
    runApplication<NowPassApplication>(*args)
}
