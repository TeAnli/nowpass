# NowPass 面试题库站点

Kotlin + Spring Boot + Exposed + PostgreSQL + Redis 的面试题库站点，后端采用四模块分层与
RBAC 权限点设计，前端另起 React 项目。

> 当前进度：**后端已完成，前端界面已实现并通过构建**（联调需先启动 Docker 中间件）。

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
| 前端 | React 19 + TypeScript + Vite + Ant Design 5 + TanStack Query + Zustand |

## 模块结构

```
nowpass/
├── nowpass-common      通用：R/PageResult/异常/注解/常量
├── nowpass-framework   框架：Exposed 配置、token、验证码、限流、日志切面、邮件
├── nowpass-system      领域：domain/dao/service
├── nowpass-admin       入口：controller、启动类、Flyway 脚本、打包
├── frontend            React 单页应用（用户端 + 管理端同一项目）
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

## 快速开始（前端）

```bash
cd frontend
pnpm install
pnpm dev          # http://127.0.0.1:5173，/api 自动代理到 18090
pnpm build        # 类型检查 + 生产构建
```

- 视觉与页面规范：[docs/06-frontend-design.md](docs/06-frontend-design.md)
- 前端从 `sessionStorage` 读取会话 token；401 会清空本地会话并跳转登录。
- 管理端按权限点隐藏危险操作，但服务端仍会独立校验（前端隐藏不是安全边界）。

## 一键全栈 Docker

```bash
# 中间件 + 后端 + Nginx 前端
docker compose --profile app up -d --build

# 前端 http://127.0.0.1:8088
# 后端 http://127.0.0.1:18090
# Mailpit http://127.0.0.1:8025
```

默认 `docker compose up -d` 仍只启动中间件，保留 Vite/IDE 热更新开发模式。详见 [docs/07-docker.md](docs/07-docker.md)。

## 文档索引

见 [docs/README.md](docs/README.md)。

## 变更日志

见 [CHANGELOG.md](CHANGELOG.md)。
