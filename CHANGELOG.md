# 变更日志

本项目所有重要变更记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中
- 前端真实接口联调（需先启动 `docker compose up -d`）
- 生产部署时将 `frontend/dist` 打包进后端静态资源

## [0.10.0] - 2026-10-27

### 新增
- 新增独立视频讲解模块：`/videos` 列表、`/videos/:id` 播放页
- 新增私有 MinIO 存储：视频 `videos/{id}/{uuid}.mp4`、封面 `covers/{id}/{uuid}.jpg`
- 管理员直传：创建草稿 → 预签名 PUT → finalize 校验 → 发布/下线
- 新增视频分类、标签、讲师、关联题目、封面占位、播放进度与倍速记忆
- 后台新增视频管理、视频分类管理，支持草稿预览与孤儿清理
- 权限点：`video:list/query/add/edit/remove/publish` 与 `video:category:*`
- `docker-compose.yml` 增加 MinIO 服务，本机端口 `9002/9003`（9000 被其它项目占用）
- 新增 `docs/09-video.md`

### 验证
- V7 迁移成功；MinIO 私有桶创建成功
- 管理端创建草稿、预签名上传、finalize、发布、用户端列表/详情/播放签名链路通过
- MinIO CORS 预检返回 204
- 前端 TypeScript、后端 Kotlin 编译通过

## [0.9.0] - 2026-10-27

### 新增
- 新增 `/interview` AI 面试间：选题、开始/随机题、对话、计时与本地会话
- 支持浏览器麦克风语音识别，识别结果先填入输入框，可修改后发送
- 支持文字输入、Enter 发送、Shift+Enter 换行和 AI 回复朗读
- 新增 `POST /api/interview/chat`，携带题目上下文与最近对话历史
- 支持 OpenAI 兼容模型接口（OpenAI / DeepSeek / 通义等），未配置密钥时降级为本地模拟面试官
- 题目详情页新增「和 AI 面试官聊聊这道题」入口
- 新增 `docs/08-ai-interview.md` 配置与安全说明

### 验证
- 本地降级接口验证：开场问题与基于回答的追问均正常返回
- 前端 TypeScript、后端 Kotlin 编译通过
- `/interview` 容器内真实 token 渲染通过，语音输入按钮与 AI 面试官界面正常
- 前后端镜像重建，容器 healthy

## [0.8.0] - 2026-10-27

### 新增
- 顶部导航取消圆角胶囊背景，改为 GSAP 滑动的 2px 墨线与方形端点
- 路由切换时墨线连续滑动；hover 菜单时临时跟随，离开后回到当前路由
- 知识标签卡、热门题、题目序号、路线阶段和账户头像增加克制的悬浮动画
- 动效统一 120–320ms，仅使用 transform/opacity，reduced-motion 下关闭位移

### 验证
- 前端 TypeScript 与 `pnpm build` 通过
- 前端镜像重建，容器 healthy
- 容器内真实 token 渲染验证：导航、墨线指示器与首页内容正常

## [0.7.0] - 2026-10-27

### 新增
- 新增 6 个知识标签：分布式系统、微服务、数据结构与算法、容器与云原生、Web 安全、Linux
- 新增 30 道面试题，题库扩展至 **17 个标签、50 道题**
- 新增标签图标：`lucide:share-2`、`lucide:boxes`、`lucide:binary`、`logos:docker-icon`、`lucide:shield-check`、`lucide:terminal`
- 刷题路线扩展为七站，新增算法、框架与云原生、分布式与安全阶段
- 题库说明中的标签数和题目数改为动态统计，避免后续扩题后文案过期

### 验证
- V6 迁移成功：17 个分类、50 道题
- 分类 API 返回新增标签与图标，新增分类各 5 道题
- `/`、`/topics`、`/questions`、`/roadmap` 均返回 200
- 前端 TypeScript 检查、Docker 镜像重建通过，前后端容器 healthy

## [0.6.0] - 2026-10-27

### 新增
- 分类新增 `icon` 数据库字段（V4），预置 Java/Kotlin/Spring/PostgreSQL 等彩色 Iconify 图标
- 后台分类管理支持从常用图标选择或输入自定义图标名，并实时预览
- 新增 `/topics` 知识标签卡片页，与 `/questions` 题目列表彻底拆分
- 题库列表新增分类下拉筛选，仍保留难度、标签、关键词、排序、收藏与列表自定义
- 新增“并发编程 / Redis / 消息队列 / 设计模式 / 操作系统”五个知识标签（V5）
- 新增 11 道并发、缓存、消息队列、设计模式、操作系统与数据库面试题，共 20 道题

### 验证
- V4/V5 迁移成功：11 个分类、20 道题，分类 API 返回 `icon`
- `/topics` 与 `/questions` 容器内真实 token 渲染验证通过
- 前端 TypeScript、后端 Kotlin 编译通过；容器镜像已重建并 healthy

## [0.5.0] - 2026-10-27

### 新增
- 后端多阶段 Dockerfile：Gradle 构建 + Temurin 21 JRE 运行、非 root 用户、健康检查
- 前端 Dockerfile：Node 22 构建 + Nginx 静态托管、SPA history 回退、`/api` 反向代理
- `docker-compose.yml` 新增可选 `app` profile，可一键启动后端与前端容器
- `docs/07-docker.md`：开发/全栈两种模式、环境变量、QQ SMTP 注入与生产建议

### 验证
- `nowpass-backend:local`、`nowpass-frontend:local` 构建成功
- 容器内前端 `8088` 的 `/`、`/questions`、`/roadmap`、`/api/auth/captcha` 均返回 200
- 后端容器健康，Flyway 与管理员初始化正常

## [0.4.0] - 2026-10-27

### 新增
- 新增主页 `/`：品牌主视觉、题库统计、知识点入口、热门面试题与刷题路线入口
- 新增刷题路线 `/roadmap`：五站式路径与本地完成进度
- 题库迁移到 `/questions`：六个知识点卡片、热门题区域、排序与更多筛选
- 用户自定义：每页数量、列表密度、标签显隐、题目收藏（localStorage）
- 题目列表展示浏览量；详情打开时 `view_count` 自增
- 后端 `GET /api/questions` 支持 `sort=latest/hot/oldest/title`，新增 V3 `view_count` 迁移

### 验证
- `pnpm build`、后端 `bootJar` 通过
- V3 迁移成功，`sort=hot` 生效；详情浏览后浏览量 0 → 1
- 主页、题库、刷题路线三个路由使用真实 token 渲染验证通过

## [0.3.0] - 2026-10-27

### 新增
- v2 UI 重设计：1320px 页头、1280px 业务版心、1080px 居中题库索引与题目阅读卡
- 题目详情改为「题干 + 答案同轴居中」：答案不再占用右侧栏，改为下方 980px 独立卡片
- 引入 GSAP：路由切换、题库列表 stagger、答案展开与滚动定位
- 引入 Iconify（Lucide）并新增 `AppIcon`，替换全部 Ant Design Icons，统一图标语言
- 登录页改为 1440px 分栏卡片；后台改为深墨绿侧栏 + 1280px 内容区
- 微交互：按钮按压缩放、卡片抬升、表格操作按钮 hover/focus 显示

### 验证
- `pnpm exec tsc --noEmit`、`pnpm build` 通过
- 前端 5173、后端 18090、Vite 代理均返回 200

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
