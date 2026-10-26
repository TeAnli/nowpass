package com.nowpass.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * OpenAPI 文档配置。
 *
 * 调试方式：先调 `POST /api/auth/login` 拿 token，再点右上角 Authorize 填入即可。
 */
@Configuration
class OpenApiConfig {

    /**
     * 构建 OpenAPI 文档定义，由 springdoc 收集并渲染到 `swagger-ui.html`。
     *
     * 做三件事：
     * 1. 声明标题、描述与版本号（版本仅用于文档展示，与构建产物版本无关）；
     * 2. 注册名为 `bearerAuth` 的安全方案（HTTP Bearer），Swagger UI 才会出现右上角的 Authorize 按钮；
     * 3. 把它设为全局安全要求，使所有接口默认按「需要登录」展示。
     *
     * 两个容易误会的点：
     * - 本项目的 token 是**不透明随机串**（32 位 UUID，作为 Redis 会话键 `login_tokens:{token}` 存在），
     *   不是 JWT，所以 `bearerFormat` 填 `tokenId`。Swagger 只负责把它拼成
     *   `Authorization: Bearer <token>`，既不解析也不校验；真正的校验在 `AuthTokenFilter`
     *   里查 Redis，并把会话快照放进 SecurityContext。
     * - 白名单接口（登录、获取验证码、发送邮箱验证码、注册、找回密码）同样挂着全局安全方案，
     *   文档上会显示小锁图标，但服务端 `SecurityConfig` 已放行，所以不带 token 也能直接调通。
     *
     * @return 全局 OpenAPI 定义对象
     */
    @Bean
    fun nowPassOpenApi(): OpenAPI {
        val schemeName = "bearerAuth"
        return OpenAPI()
            .info(
                Info()
                    .title("NowPass 面试题库 API")
                    .description("四模块分层 + RBAC 权限点 + Redis 有状态 token")
                    .version("0.1.0"),
            )
            .components(
                Components().addSecuritySchemes(
                    schemeName,
                    SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("tokenId")
                        .description("填写登录接口返回的 token（不需要 Bearer 前缀，Swagger 会自动加）"),
                ),
            )
            .addSecurityItem(SecurityRequirement().addList(schemeName))
    }
}
