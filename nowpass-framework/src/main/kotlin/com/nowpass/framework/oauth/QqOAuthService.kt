package com.nowpass.framework.oauth

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.nowpass.common.constant.CacheKeys
import com.nowpass.common.enums.UserStatus
import com.nowpass.common.exception.ErrorCode
import com.nowpass.common.exception.ServiceException
import com.nowpass.framework.auth.LoginResult
import com.nowpass.framework.auth.UserProfile
import com.nowpass.framework.config.QqProperties
import com.nowpass.framework.security.RolePermissions
import com.nowpass.framework.security.TokenService
import com.nowpass.system.domain.dao.UserOauthDao
import com.nowpass.system.domain.model.SysUser
import com.nowpass.system.service.SysUserService
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.client.RestClient
import org.springframework.web.util.UriComponentsBuilder
import java.net.URLDecoder
import java.net.URLEncoder
import java.net.http.HttpClient
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * QQ 互联 OAuth 登录。
 *
 * 浏览器只接触 state/ticket 这类一次性随机值，access_token 和 AppKey 不落到前端。
 */
@Service
class QqOAuthService(
    private val properties: QqProperties,
    private val sysUserService: SysUserService,
    private val userOauthDao: UserOauthDao,
    private val tokenService: TokenService,
    private val passwordEncoder: PasswordEncoder,
    private val redis: StringRedisTemplate,
    private val objectMapper: ObjectMapper,
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build()
    private val requestFactory = JdkClientHttpRequestFactory(httpClient).apply {
        setReadTimeout(Duration.ofSeconds(15))
    }
    private val restClient = RestClient.builder().requestFactory(requestFactory).build()

    fun status(): Boolean = properties.configured

    fun authorizationUrl(): String {
        requireConfigured()
        val state = UUID.randomUUID().toString().replace("-", "")
        redis.opsForValue().set(
            CacheKeys.oauthQqState(state),
            "1",
            properties.stateMinutes,
            TimeUnit.MINUTES,
        )
        return UriComponentsBuilder.fromUriString("https://graph.qq.com/oauth2.0/authorize")
            .queryParam("response_type", "code")
            .queryParam("client_id", properties.appId)
            .queryParam("redirect_uri", properties.redirectUri)
            .queryParam("state", state)
            .queryParam("scope", "get_user_info")
            .build()
            .encode()
            .toUriString()
    }

    @Transactional
    fun handleCallback(code: String, state: String, loginIp: String): String {
        requireConfigured()
        if (state.isBlank()) throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 登录 state 缺失")
        val stateKey = CacheKeys.oauthQqState(state)
        if (redis.opsForValue().getAndDelete(stateKey) == null) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 登录 state 已失效，请重新发起登录")
        }

        val accessToken = exchangeAccessToken(code)
        val openId = fetchOpenId(accessToken)
        val qqUser = fetchUserInfo(accessToken, openId)
        val user = findOrCreateUser(openId, qqUser)
        if (user.status == UserStatus.DISABLED) throw ServiceException(ErrorCode.ACCOUNT_DISABLED)
        if (user.status == UserStatus.PENDING) throw ServiceException(ErrorCode.ACCOUNT_PENDING)

        val permissions = RolePermissions.permissionsOf(user.roleKeys)
        val loginUser = tokenService.create(
            userId = user.id,
            username = user.username,
            nickname = user.nickname,
            email = user.email,
            roles = user.roleKeys,
            permissions = permissions,
            loginIp = loginIp,
        )
        val ticket = UUID.randomUUID().toString().replace("-", "")
        redis.opsForValue().set(
            CacheKeys.oauthQqTicket(ticket),
            loginUser.tokenId,
            properties.ticketMinutes,
            TimeUnit.MINUTES,
        )
        log.info("QQ 登录成功：userId={}, nickname={}", user.id, user.nickname)
        return appendQuery(properties.frontendRedirectUri, "ticket", ticket)
    }

    fun exchangeTicket(ticket: String): LoginResult {
        if (ticket.isBlank()) throw ServiceException(ErrorCode.BAD_REQUEST, "登录票据不能为空")
        val key = CacheKeys.oauthQqTicket(ticket)
        val tokenId = redis.opsForValue().getAndDelete(key)
            ?: throw ServiceException(ErrorCode.UNAUTHORIZED, "登录票据已失效，请重新登录")
        val loginUser = tokenService.load(tokenId)
            ?: throw ServiceException(ErrorCode.UNAUTHORIZED, "登录态已失效，请重新登录")
        return LoginResult(
            token = tokenId,
            expireAt = loginUser.expireAt,
            user = UserProfile(
                id = loginUser.userId,
                username = loginUser.username,
                nickname = loginUser.nickname,
                email = loginUser.email,
                roles = loginUser.roles,
                permissions = loginUser.permissions,
                canEnterAdmin = RolePermissions.canEnterAdmin(loginUser.roles),
            ),
        )
    }

    fun errorRedirect(message: String): String =
        appendQuery(properties.frontendRedirectUri, "error", message)

    private fun findOrCreateUser(openId: String, qqUser: QqUserInfo): SysUser {
        val identity = userOauthDao.find("qq", openId)
        if (identity != null) {
            userOauthDao.touch(identity.id, qqUser.nickname, qqUser.avatarUrl)
            return sysUserService.findById(identity.userId)
                ?: throw ServiceException(ErrorCode.NOT_FOUND, "QQ 绑定的用户不存在")
        }

        val username = uniqueUsername(openId)
        val email = uniqueEmail(openId)
        val nickname = qqUser.nickname?.trim()?.take(30)?.takeIf { it.isNotEmpty() } ?: "QQ 用户"
        val userId = sysUserService.create(
            username = username,
            encodedPassword = passwordEncoder.encode(UUID.randomUUID().toString()),
            nickname = nickname,
            email = email,
            status = UserStatus.ACTIVE.name.lowercase(),
            roleKey = RolePermissions.ROLE_USER,
            remark = "QQ OAuth 自动创建",
            operator = "qq-oauth",
        )
        userOauthDao.insert(
            userId = userId,
            provider = "qq",
            providerUserId = openId,
            unionId = null,
            nickname = qqUser.nickname,
            avatarUrl = qqUser.avatarUrl,
        )
        return sysUserService.findById(userId)
            ?: throw ServiceException(ErrorCode.NOT_FOUND, "QQ 用户创建失败")
    }

    private fun exchangeAccessToken(code: String): String {
        val url = UriComponentsBuilder.fromUriString("https://graph.qq.com/oauth2.0/token")
            .queryParam("grant_type", "authorization_code")
            .queryParam("client_id", properties.appId)
            .queryParam("client_secret", properties.appKey)
            .queryParam("code", code)
            .queryParam("redirect_uri", properties.redirectUri)
            .queryParam("fmt", "json")
            .build()
            .encode()
            .toUriString()
        val body = runCatching { restClient.get().uri(url).retrieve().body(String::class.java) }
            .getOrElse { throw ServiceException(ErrorCode.BAD_REQUEST, "无法连接 QQ 登录服务") }
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 登录服务返回为空")

        val json = parseJsonOrForm(body)
        json.path("error").takeIf { !it.isMissingNode }?.asText()?.let { error ->
            throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 授权失败：$error")
        }
        return json.path("access_token").asText().takeIf { it.isNotBlank() }
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 未返回 access_token")
    }

    private fun fetchOpenId(accessToken: String): String {
        val url = UriComponentsBuilder.fromUriString("https://graph.qq.com/oauth2.0/me")
            .queryParam("access_token", accessToken)
            .queryParam("fmt", "json")
            .build()
            .encode()
            .toUriString()
        val body = restClient.get().uri(url).retrieve().body(String::class.java)
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 未返回 openid")
        val json = parseJsonOrForm(unwrapJsonp(body))
        val openId = json.path("openid").asText()
        if (openId.isBlank()) throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 未返回 openid")
        return openId
    }

    private fun fetchUserInfo(accessToken: String, openId: String): QqUserInfo {
        val url = UriComponentsBuilder.fromUriString("https://graph.qq.com/user/get_user_info")
            .queryParam("access_token", accessToken)
            .queryParam("oauth_consumer_key", properties.appId)
            .queryParam("openid", openId)
            .build()
            .encode()
            .toUriString()
        val body = restClient.get().uri(url).retrieve().body(String::class.java)
            ?: throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 未返回用户信息")
        val json = objectMapper.readTree(body)
        if (json.path("ret").asInt(0) != 0) {
            throw ServiceException(ErrorCode.BAD_REQUEST, "QQ 用户信息获取失败：${json.path("msg").asText()}")
        }
        return QqUserInfo(
            nickname = json.path("nickname").asText(null),
            avatarUrl = json.path("figureurl_qq_2").asText(null)
                ?: json.path("figureurl_qq_1").asText(null),
        )
    }

    private fun parseJsonOrForm(body: String): JsonNode {
        val trimmed = body.trim()
        if (trimmed.startsWith("{")) return objectMapper.readTree(trimmed)
        val fields = trimmed.split("&")
            .mapNotNull { pair ->
                val index = pair.indexOf('=')
                if (index <= 0) null else {
                    URLDecoder.decode(pair.substring(0, index), StandardCharsets.UTF_8) to
                        URLDecoder.decode(pair.substring(index + 1), StandardCharsets.UTF_8)
                }
            }
            .toMap()
        return objectMapper.valueToTree(fields)
    }

    private fun unwrapJsonp(body: String): String {
        val start = body.indexOf('(')
        val end = body.lastIndexOf(')')
        return if (start >= 0 && end > start) body.substring(start + 1, end) else body
    }

    private fun uniqueUsername(openId: String): String {
        val base = "qq_" + openId.lowercase().replace(Regex("[^a-z0-9]"), "").take(20)
        var candidate = base
        var index = 1
        while (sysUserService.existsByUsername(candidate)) {
            candidate = (base.take(26) + index).take(30)
            index += 1
        }
        return candidate
    }

    private fun uniqueEmail(openId: String): String {
        val base = "qq_${openId.lowercase().replace(Regex("[^a-z0-9]"), "").take(24)}@oauth.nowpass.local"
        var candidate = base
        var index = 1
        while (sysUserService.existsByEmail(candidate)) {
            candidate = "qq_${openId.take(24)}_$index@oauth.nowpass.local"
            index += 1
        }
        return candidate
    }

    private fun requireConfigured() {
        if (!properties.configured) {
            throw ServiceException(ErrorCode.NOT_IMPLEMENTED, "QQ 登录未配置")
        }
    }

    private fun appendQuery(uri: String, key: String, value: String): String {
        val separator = if (uri.contains('?')) '&' else '?'
        return "$uri$separator$key=${URLEncoder.encode(value, StandardCharsets.UTF_8)}"
    }

    private data class QqUserInfo(
        val nickname: String?,
        val avatarUrl: String?,
    )
}
