package com.nowpass.framework.web

import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.common.response.R
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.AuthenticationException
import org.springframework.validation.BindException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.servlet.resource.NoResourceFoundException

/**
 * 全局异常处理。
 *
 * HTTP 状态约定：
 * - 参数错误 -> 400，**未认证（token 无效/过期）-> 401**，无权限 -> 403，不存在 -> 404
 * - **其余业务错误（6xx，含登录失败、账号锁定、限流）一律 HTTP 200**，
 *   错误含义放在 `R.code` 里。这一点很关键：若把「密码错误」也返回 401，
 *   前端拦截器会把它当成"会话过期"并跳登录页，用户会看到莫名其妙的跳转。
 * - 未预期异常 -> 500，且不把堆栈细节暴露给客户端
 */
@RestControllerAdvice
class GlobalExceptionHandler {

    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(ServiceException::class)
    fun handleServiceException(e: ServiceException): ResponseEntity<R<Unit>> {
        val errorCode = e.errorCode
        val status = when (errorCode) {
            ErrorCode.UNAUTHORIZED -> HttpStatus.UNAUTHORIZED
            ErrorCode.FORBIDDEN -> HttpStatus.FORBIDDEN
            ErrorCode.NOT_FOUND -> HttpStatus.NOT_FOUND
            ErrorCode.BAD_REQUEST -> HttpStatus.BAD_REQUEST
            ErrorCode.METHOD_NOT_ALLOWED -> HttpStatus.METHOD_NOT_ALLOWED
            ErrorCode.INTERNAL_ERROR -> HttpStatus.INTERNAL_SERVER_ERROR
            else -> HttpStatus.OK
        }
        if (status == HttpStatus.INTERNAL_SERVER_ERROR) {
            log.error("业务异常：{}", e.message, e)
        } else {
            log.warn("业务异常：code={}, msg={}", errorCode.code, e.message)
        }
        return ResponseEntity.status(status).body(R.fail(errorCode.code, e.message))
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(e: MethodArgumentNotValidException): ResponseEntity<R<Unit>> {
        val message = e.bindingResult.fieldErrors
            .joinToString("; ") { "${it.field}: ${it.defaultMessage}" }
            .ifBlank { ErrorCode.BAD_REQUEST.message }
        return ResponseEntity.badRequest().body(R.fail(ErrorCode.BAD_REQUEST.code, message))
    }

    @ExceptionHandler(BindException::class)
    fun handleBind(e: BindException): ResponseEntity<R<Unit>> {
        val message = e.bindingResult.fieldErrors
            .joinToString("; ") { "${it.field}: ${it.defaultMessage}" }
            .ifBlank { ErrorCode.BAD_REQUEST.message }
        return ResponseEntity.badRequest().body(R.fail(ErrorCode.BAD_REQUEST.code, message))
    }

    @ExceptionHandler(
        MissingServletRequestParameterException::class,
        HttpMessageNotReadableException::class,
        IllegalArgumentException::class,
    )
    fun handleBadRequest(e: Exception): ResponseEntity<R<Unit>> =
        ResponseEntity.badRequest().body(R.fail(ErrorCode.BAD_REQUEST.code, e.message ?: "请求参数错误"))

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(e: AccessDeniedException): ResponseEntity<R<Unit>> =
        ResponseEntity.status(HttpStatus.FORBIDDEN).body(R.fail(ErrorCode.FORBIDDEN))

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthentication(e: AuthenticationException): ResponseEntity<R<Unit>> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(R.fail(ErrorCode.UNAUTHORIZED))

    @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
    fun handleMethodNotSupported(e: HttpRequestMethodNotSupportedException): ResponseEntity<R<Unit>> =
        ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(R.fail(ErrorCode.METHOD_NOT_ALLOWED))

    @ExceptionHandler(NoResourceFoundException::class)
    fun handleNotFound(e: NoResourceFoundException): ResponseEntity<R<Unit>> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(R.fail(ErrorCode.NOT_FOUND))

    @ExceptionHandler(Exception::class)
    fun handleException(e: Exception): ResponseEntity<R<Unit>> {
        log.error("未预期的异常：{}", e.message, e)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(R.fail(ErrorCode.INTERNAL_ERROR))
    }
}
