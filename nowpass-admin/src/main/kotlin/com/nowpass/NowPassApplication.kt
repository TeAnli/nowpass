package com.nowpass

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

/**
 * NowPass 启动类。
 *
 * 模块依赖方向（严格单向）：admin -> framework -> system -> common
 */
@SpringBootApplication
@EnableScheduling
class NowPassApplication

fun main(args: Array<String>) {
    runApplication<NowPassApplication>(*args)
}
