package com.nowpass.controller

import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.R
import com.nowpass.framework.auth.LoginResult
import com.nowpass.framework.oauth.QqOAuthService
import com.nowpass.framework.web.IpUtils
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.net.URI

data class QqStatusResponse(val enabled: Boolean)

data class QqAuthorizeResponse(val url: String)

data class QqExchangeRequest(
    @field:NotBlank(message = "登录票据不能为空")
    val ticket: String,
)

/**
 * QQ 互联 OAuth。未配置 AppID/AppKey 时 status 返回 false，前端隐藏入口。
 */
@Tag(name = "05. QQ 登录", description = "QQ 互联 OAuth 授权、回调与一次性票据交换")
@RestController
@RequestMapping("/api/auth/qq")
class QqAuthController(
    private val qqOAuthService: QqOAuthService,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Operation(summary = "QQ 登录是否可用")
    @GetMapping("/status")
    fun status(): R<QqStatusResponse> = R.ok(QqStatusResponse(qqOAuthService.status()))

    @Operation(summary = "获取 QQ 授权地址")
    @GetMapping("/authorize")
    fun authorize(): R<QqAuthorizeResponse> = R.ok(QqAuthorizeResponse(qqOAuthService.authorizationUrl()))

    @Operation(summary = "QQ 授权回调", description = "校验 state 后换取用户信息，并跳转前端携带一次性 ticket")
    @GetMapping("/callback")
    fun callback(
        @RequestParam(required = false) code: String?,
        @RequestParam(required = false) state: String?,
        request: HttpServletRequest,
    ): ResponseEntity<Void> {
        if (code.isNullOrBlank()) {
            return redirect(qqOAuthService.errorRedirect("QQ 授权已取消"))
        }
        return try {
            val target = qqOAuthService.handleCallback(code, state.orEmpty(), IpUtils.getClientIp(request))
            redirect(target)
        } catch (exception: ServiceException) {
            log.warn("QQ 登录回调失败：{}", exception.message)
            redirect(qqOAuthService.errorRedirect(exception.message))
        } catch (exception: Exception) {
            log.error("QQ 登录回调异常", exception)
            redirect(qqOAuthService.errorRedirect("QQ 登录失败，请稍后重试"))
        }
    }

    @Operation(summary = "用一次性 ticket 换登录态")
    @PostMapping("/exchange")
    fun exchange(@Valid @RequestBody request: QqExchangeRequest): R<LoginResult> =
        R.ok(qqOAuthService.exchangeTicket(request.ticket))

    private fun redirect(url: String): ResponseEntity<Void> =
        ResponseEntity.status(HttpStatus.FOUND).location(URI.create(url)).build()
}
