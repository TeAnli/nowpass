# 变更日志

本项目所有重要变更记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中
- 前端真实接口联调（需先启动 `docker compose up -d`）
- 生产部署时将 `frontend/dist` 打包进后端静态资源

## [0.2.0] - 2026-10-26

### 新增
- React 19 + TypeScript + Vite 单页应用，用户端与管理端共用一套路由和设计 token
- 登录、注册、找回密码：图形验证码、邮箱验证码弹窗、待审批提示、会话过期统一跳转
- 题库列表（分类/难度/标签/关键词筛选写入 URL）、详情页、按需加载的标准答案附页、个人中心
- 后台题目/分类/用户/在线会话/操作日志五个页面，含权限点控制、危险操作确认、Markdown 编辑预览
- 三层设计 token（primitive → semantic → component）与深色主题，Ant Design 主题对齐
- `docs/06-frontend-design.md`：页面结构、组件状态、响应式与可访问性验收清单

### 验证
- `pnpm exec tsc --noEmit` 通过；`pnpm build` 通过；`pnpm lint` 无 error（3 条 Fast Refresh warning）
- Vite 开发服务器可返回页面；后端接口联调因本机 Docker Desktop 未运行、PostgreSQL 5434 不可达而暂缓

## [0.1.7] - 2026-10-26

### 变更
- 清理后端代码注释与文档中对外部参考框架的引用（**57 处、30 个文件**），全部改写为自洽描述，而不是简单删词
- 删除一份整篇为外部框架对照表的文档（其中的取舍理由已在 `docs/01-decisions.md` 以自有表述保留，无信息损失）
- `docs/06-development.md` 顺延为 `docs/05-development.md`，`docs/README.md` 索引与各处交叉引用同步更新
- `V1__init_schema.sql` 中 `sys_oper_log` 表注释改写为自洽描述

### 验证
- 全仓检索相关关键词（不区分大小写）**零命中**
- `V1` 已执行过，改动会使 Flyway 校验和不匹配，故重建本地数据库：`docker compose down -v` 后重新执行 V1/V2 成功，库内表注释已为新文案
- `./gradlew build` 通过（10 tests）
- 冒烟：超管登录 200、题库 9 条、OpenAPI 27 个路径、测试账号注册→审批→登录 200

## [0.1.6] - 2026-10-26

### 新增
- `http/nowpass.http`：36 个请求的接口调试集（自动捕获 captcha uuid 与登录 token）
- 后端文档集补齐：
  - `docs/02-architecture.md`：模块依赖方向、请求处理链路、分层职责、关键取舍
  - `docs/04-api.md`：全部接口、认证约定、HTTP 状态与业务码分工、错误码表
  - `docs/05-development.md`：启动步骤、端口一览、常用运维命令、迁移约定、踩坑记录、升级路径
- 单元测试（10 个，`:nowpass-framework:test` 全绿）：
  - `ArithmeticGeneratorTest`：算式格式、答案正确性、减法非负、校验忽略空格
  - `RolePermissionsTest`：普通用户零权限、admin 无危险操作、超管全量、多角色并集、未知角色

### 变更
- README / 数据库文档同步端口调整（应用 18090、PostgreSQL 5434）

### 验证
- `./gradlew build` BUILD SUCCESSFUL（含 10 个单测）
- 后端接口全部实测通过，详见 0.1.5 的 E2E 结论

## [0.1.5] - 2026-10-26

### 新增
- `nowpass-admin` 接口层（共 27 个 OpenAPI 路径）：
  - 认证：`/api/auth/captcha`、`/email-code`、`/login`、`/register`、`/reset-password`、`/logout`、`/me`
  - 用户端：`/api/questions`（分页筛选）、`/api/questions/{id}`（不含答案）、`/api/questions/{id}/answer`、`/api/categories`
  - 个人中心：`/api/user/profile`、`/api/user/password`
  - 后台：`/api/admin/questions` CRUD、`/categories` CRUD、`/users`（列表/建号/角色/状态/重置密码/删除）、`/online`（列表/强退）、`/oper-logs`
  - `UserAdminService`：管理员建号、审批、停用、改角色、重置密码、删除（均带"改完即踢会话"）
  - `OpenApiConfig`：springdoc + Bearer 授权按钮
- 接口入参 DTO 与 Jakarta Validation 校验（`request/AuthRequests.kt`、`request/AdminRequests.kt`）

### 修复
- **越权缺陷**：`user` 角色原本带有 `question:list`，导致普通用户可访问后台题目列表接口（虽不含答案仍属越权）。改为普通用户零权限点——用户端接口只要求"已登录"，权限点只用于 `/api/admin` 下的接口
- **错误状态映射**：登录失败/账号锁定原先返回 HTTP 401，会被前端拦截器误判为"会话过期"并跳登录页。改为仅"token 无效"返回 401，其余业务错误（6xx，含登录失败、锁定、限流）返回 HTTP 200 + 业务码
- E2E 联调结论：验证码、登录、注册（待审批）、审批、越权拦截、失败锁定、限流、强退、改密失效旧会话、登出，全部实测通过

## [0.1.4] - 2026-10-26

### 新增
- `nowpass-framework` 框架层：
  - `ExposedConfig`：`SpringTransactionManager` 接管 Spring 事务，**不开启自动建表**（表结构由 Flyway 独占）
  - `NowPassProperties`：`nowpass.token / mail / register / login / init` 全部可配
  - 有状态会话：`TokenService`（Redis 存 `LoginUser`、滑动续期、按用户批量清会话、SCAN 枚举在线用户）、`AuthTokenFilter`、`SecurityUtils`
  - `RolePermissions`：角色→权限点映射（superadmin / admin / user 三档，权限点写在代码里）
  - `SecurityConfig`：无状态、关闭 CSRF（不用 cookie）、`/api` 需登录、匿名白名单、401/403 返回统一 JSON
  - `CaptchaService` + `ArithmeticGenerator`：算术图形验证码，答案存 Redis 2 分钟、一次性
  - `RedisRateLimiter` + `RateLimiterAspect`：Lua 原子计数的固定窗口限流
  - `OperLogAspect`：`@Log` 落库，参数/结果截断 2000 字符，记录失败不影响主流程
  - 邮件可插拔：`EmailService` 接口 + `SmtpEmailService`（`nowpass.mail.enabled=true`）/ `NoopEmailService`（默认，验证码写日志）
  - `EmailCodeService`：6 位验证码、5 分钟、一次性
  - `AuthService`：登录（验证码→锁定→密码→状态 的固定校验顺序）、注册（邮箱验证码 + 待审批）、找回密码（改密后清空全部会话）、改密
  - `AdminInitializer`：`ApplicationRunner` 幂等创建超级管理员（避开 Flyway 里写 BCrypt 哈希）
  - `GlobalExceptionHandler`：业务错误返 200 + 业务码，鉴权/参数/系统错误返对应 HTTP 状态

### 修复（踩坑记录）
- hutool `CodeGenerator.verify` 是**两参数**(`code`, `userInputCode`)，不是一参数
- **Kotlin 块注释可嵌套**：KDoc 里写 `/api/**` 会开启新注释，导致 "Unclosed comment"，注释中需避免双星号路径
- `SecurityUtils` 用 `?: return null` 取值时不要显式标注可空类型，否则智能转换失效
- hutool 图片 base64 用属性访问 `captcha.imageBase64Data`（不是方法调用）

## [0.1.3] - 2026-10-26

### 新增
- `nowpass-system` 领域层完成（领域模型 + DAO + Service）：
  - 表定义：`SysUserTable` / `SysRoleTable` / `SysUserRoleTable` / `QuestionCategoryTable` / `QuestionTable` / `SysOperLogTable`
  - 领域模型与 DTO：显式区分「列表项（不含长文本）」「详情（不含答案）」「标准答案」，答案只能经独立方法取得
  - DAO：`SysUserDao` / `SysRoleDao` / `QuestionDao` / `QuestionCategoryDao` / `OperLogDao`
  - Service：`SysUserService` / `QuestionService` / `QuestionCategoryService` / `OperLogService`
  - 查询条件：`UserPageQuery` / `QuestionPageQuery` / `OperLogPageQuery`
- 业务校验前置：选择题必须同时有选项与答案键、答案键必须落在选项范围内；分类下仍有题目时拒绝删除分类

### 修复（Exposed 1.6 迁移踩坑记录）
- `Table.options` 是 Exposed 自带成员，`jsonb` 列属性不能命名为 `options`，改名为 `optionJson`（列名仍为 `options`）
- Exposed 1.6 的 `and` / `andWhere` 分属 `v1.core` 与 `v1.jdbc` 两个包，必须分别 import
- `@Max` / `@Min` 注解参数类型是 `Long`，Kotlin `Int` 常量需显式 `.toLong()`

### 变更
- `PageQuery` 从构造器参数改为 JavaBean 风格（`var` + setter 内做范围收敛），因为 Spring `@ModelAttribute` 对 Kotlin 构造器绑定不可靠

### 未决
- 标签筛选暂用 PostgreSQL `tags @> array[?]` 原生查询取 id 集合（Exposed 无数组包含 DSL），走 GIN 索引，代价可接受

## [0.1.2] - 2026-10-26

### 新增
- `nowpass-common` 通用层（保持纯 Kotlin，不依赖 servlet/web）：
  - `R<T>` 统一响应（字段 `code/msg/data`）
  - `PageResult<T>` 分页响应（字段 `rows/total`）+ `PageQuery` 分页入参（页码从 1 开始，页容量上限 200）
  - `ErrorCode` 错误码枚举（2xx 成功 / 4xx 请求错误 / 500 系统错误 / 6xx 业务错误，鉴权类集中在 61x~62x）
  - `ServiceException` 业务异常
  - `@Log` + `BusinessType`（操作日志）、`@RateLimiter` + `LimitType`（限流）
  - `CacheKeys` 统一 Redis 键前缀与构造方法
  - `Permissions` 权限点常量（权限点写在代码里，不建菜单表）
  - `UserStatus` / `Difficulty` 枚举

### 验证
- `:nowpass-common:compileKotlin` 通过

## [0.1.1] - 2026-10-26

### 新增
- `docker-compose.yml`：PostgreSQL 16（宿主机 5434）+ Redis 7 + Mailpit（1025/8025），三者均带 healthcheck
- Flyway 迁移脚本 `V1__init_schema.sql`：6 张表（`sys_user` / `sys_role` / `sys_user_role` / `question_category` / `question` / `sys_oper_log`）
  - 逻辑删除用部分唯一索引规避软删冲突；`question.options` 用 `jsonb`、`question.tags` 用 `text[]`
  - 含 `pg_trgm` 扩展与 GIN 索引，支撑 `title ILIKE '%关键词%'` 模糊搜索
- `V2__init_data.sql`：3 个角色、6 个分类、9 道示例题（含 2 道选择题的 `jsonb` 选项与答案键）
- 数据库设计文档 `docs/03-database.md`

### 变更
- 应用端口 **8080 → 8090**（8080 已被本机其它项目占用）
- 数据源端口 **5432 → 5434**（5432 为本机 PostgreSQL 18，5433 为另一项目容器）

### 验证
- `docker compose ps` 三个服务均 healthy，`redis-cli ping` 返回 PONG，Mailpit `/api/v1/info` 返回 200
- 迁移脚本在临时库 `nowpass_sqlcheck` 中以 `ON_ERROR_STOP=1` 实跑通过：9 题 / 6 分类 / 3 角色，`jsonb` 选项、`text[]` 标签、中文与 Markdown 内容、全部索引均校验无误（校验后已删除临时库）

## [0.1.0] - 2026-10-26

### 新增
- 初始化 Git 仓库与多模块 Gradle 工程骨架（`nowpass-common` / `nowpass-framework` / `nowpass-system` / `nowpass-admin`）
- Gradle Wrapper 锁定 8.14.4，Kotlin DSL，版本目录 `gradle/libs.versions.toml` 统一依赖版本
- 技术选型台账 `docs/01-decisions.md`、架构说明 `docs/02-architecture.md`
- 启动类 `com.nowpass.NowPassApplication` 与基础 `application.yml`（数据源 / Redis / Flyway / 邮件 / 自定义 `nowpass.*` 配置项）
- Maven 依赖走阿里云镜像优先、Maven Central 兜底（国内网络）
