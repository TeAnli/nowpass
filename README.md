# NowPass 面试题库站点

Kotlin + Spring Boot + Exposed + PostgreSQL + Redis 的面试题库站点，后端采用四模块分层与
RBAC 权限点设计，前端另起 React 项目。

> 当前进度：**后端开发中**（前端尚未开始）。

## 技术栈

| 层 | 选型 |
|---|---|
| 语言 / 运行时 | Kotlin 2.3.21 / JDK 21 |
| 构建 | Gradle 8.14.4（Kotlin DSL，多模块） |
| 框架 | Spring Boot 3.5.16 |
| 持久层 | JetBrains Exposed 1.6.0（DSL）+ PostgreSQL 16 |
| 迁移 | Flyway 11.7.2（`flyway-core` + `flyway-database-postgresql`） |
| 缓存 / 会话 | Redis（Lettuce），有状态 token（UUID 存 Redis，可即时撤销） |
| 安全 | Spring Security + `@PreAuthorize` 权限点 + 图形验证码 + 接口限流 |
| 文档 | springdoc-openapi（Swagger UI） |

## 模块结构

```
nowpass/
├── nowpass-common      通用：R/PageResult/异常/注解/常量
├── nowpass-framework   框架：Exposed 配置、token、验证码、限流、日志切面、邮件
├── nowpass-system      领域：domain/dao/service
├── nowpass-admin       入口：controller、启动类、Flyway 脚本、打包
└── docs/               设计与运维文档
```

依赖方向严格单向：`admin -> framework -> system -> common`。

## 快速开始（后端）

```bash
# 1. 起中间件（PostgreSQL + Redis + Mailpit）
docker compose up -d

# 2. 构建
./gradlew build

# 3. 运行
./gradlew :nowpass-admin:bootRun
# 或
java -jar nowpass-admin/build/libs/nowpass.jar
```

- API 文档：http://127.0.0.1:18090/swagger-ui.html
- 接口调试集：`http/nowpass.http`（IntelliJ HTTP Client / VS Code REST Client）
- Mailpit 收件箱：http://127.0.0.1:8025
- 默认管理员：`admin` / `Admin@123456`（见 `application.yml` 的 `nowpass.init`）

> 端口说明：应用 **18090**、PostgreSQL **5434**——8080/8090/5432/5433 在本机均被其它项目占用。
> 详见 `docs/05-development.md`。

## 文档索引

见 [docs/README.md](docs/README.md)。

## 变更日志

见 [CHANGELOG.md](CHANGELOG.md)。
