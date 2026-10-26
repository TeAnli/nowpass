# 变更日志

本项目所有重要变更记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中
- M1：鉴权体系（验证码 / 登录 / 注册 / 找回密码 / 限流 / 登录失败锁定 / 操作日志）
- M2：题库领域与用户端查询接口
- M3：后台管理接口
- M4：接口联调与文档
- 前端（React + Ant Design）

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
