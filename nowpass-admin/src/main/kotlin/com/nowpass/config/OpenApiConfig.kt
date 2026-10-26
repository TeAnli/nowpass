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
