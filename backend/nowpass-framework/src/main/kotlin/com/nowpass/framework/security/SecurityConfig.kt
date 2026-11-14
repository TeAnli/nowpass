package com.nowpass.framework.security

import com.fasterxml.jackson.databind.ObjectMapper
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.response.R
import jakarta.servlet.DispatcherType
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.MediaType
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

/**
 * Spring Security 配置。
 *
 * 访问策略：
 * - 登录、注册、验证码、发验证码、找回密码：匿名可访问
 * - 其余 `/api` 下的接口：必须登录（管理端再叠加 `@PreAuthorize` 权限点）
 * - 其它路径全部放行：生产环境这些路径由内嵌 SPA 提供，鉴权由前端路由 + 后端接口共同保证
 *
 * 注意：Kotlin 的块注释允许嵌套，注释里不要写带双星号的反引号路径，否则会被当成新注释开头。
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
class SecurityConfig(
    private val authTokenFilter: AuthTokenFilter,
    private val objectMapper: ObjectMapper,
) {

    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            // 有状态 token 走请求头，不用 cookie，因此关闭 CSRF 是安全的
            .csrf { it.disable() }
            .cors { it.disable() }
            .formLogin { it.disable() }
            .httpBasic { it.disable() }
            .logout { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { registry ->
                registry
                    // 异步请求（SSE / DeferredResult）完成后会以 ASYNC 派发再进一次过滤器链，
                    // 此时 SecurityContext 为空，若不放行会被判 Access Denied 并掐断已提交的响应。
                    // 首次请求已经过完整鉴权，这里放行派发类型是安全的。
                    .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                    .requestMatchers(
                        "/api/auth/captcha",
                        "/api/auth/login",
                        "/api/auth/register",
                        "/api/auth/email-code",
                        "/api/auth/reset-password",
                        "/api/auth/qq/status",
                        "/api/auth/qq/authorize",
                        "/api/auth/qq/callback",
                        "/api/auth/qq/exchange",
                    ).permitAll()
                    .requestMatchers(
                        "/swagger-ui.html",
                        "/swagger-ui/**",
                        "/v3/api-docs",
                        "/v3/api-docs/**",
                        "/actuator/health",
                        "/error",
                    ).permitAll()
                    .requestMatchers("/api/**").authenticated()
                    .anyRequest().permitAll()
            }
            .exceptionHandling { handling ->
                handling.authenticationEntryPoint { _, response, _ ->
                    writeError(response, HttpServletResponse.SC_UNAUTHORIZED, ErrorCode.UNAUTHORIZED)
                }
                handling.accessDeniedHandler { _, response, _ ->
                    writeError(response, HttpServletResponse.SC_FORBIDDEN, ErrorCode.FORBIDDEN)
                }
            }
            .addFilterBefore(authTokenFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    private fun writeError(response: HttpServletResponse, status: Int, errorCode: ErrorCode) {
        log.debug("认证/授权失败：status={}, code={}", status, errorCode.code)
        response.status = status
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.characterEncoding = "UTF-8"
        response.writer.write(objectMapper.writeValueAsString(R.fail<Unit>(errorCode)))
    }
}
