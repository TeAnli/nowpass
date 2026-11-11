package com.nowpass.framework.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * token 认证过滤器。
 *
 * 从 Redis 读取会话，而不是解析 JWT：
 * 每次请求一次 `GET login_tokens:{id}`，换来可即时撤销的会话。
 */
@Component
class AuthTokenFilter(
    private val tokenService: TokenService,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val tokenId = resolveToken(request)
        if (tokenId != null && SecurityContextHolder.getContext().authentication == null) {
            val loginUser = tokenService.load(tokenId)
            if (loginUser != null) {
                // 滑动续期：剩余有效期不足阈值时刷新，并把新的过期时间回传前端
                val effective = tokenService.refreshIfNeeded(loginUser) ?: loginUser
                val authentication = UsernamePasswordAuthenticationToken(
                    effective,
                    null,
                    effective.authorities().map { SimpleGrantedAuthority(it) },
                )
                authentication.details = WebAuthenticationDetailsSource().buildDetails(request)
                SecurityContextHolder.getContext().authentication = authentication
                response.setHeader(TOKEN_EXPIRE_HEADER, effective.expireAt.toString())
            } else {
                log.debug("token 不存在或已过期：{}", tokenId)
            }
        }
        filterChain.doFilter(request, response)
    }

    private fun resolveToken(request: HttpServletRequest): String? {
        val header = request.getHeader(AUTHORIZATION_HEADER)
        if (!header.isNullOrBlank() && header.startsWith(BEARER_PREFIX, ignoreCase = true)) {
            return header.substring(BEARER_PREFIX.length).trim().ifEmpty { null }
        }
        // 兼容 EventSource（无法自定义请求头）等场景
        return request.getParameter("token")?.trim()?.ifEmpty { null }
    }

    companion object {
        private const val AUTHORIZATION_HEADER = "Authorization"
        private const val BEARER_PREFIX = "Bearer "

        /** 续期后的新过期时间（epoch millis）会写回该响应头 */
        const val TOKEN_EXPIRE_HEADER = "X-Token-Expire-At"
    }
}
