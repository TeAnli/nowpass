# 数据库设计

数据库：**PostgreSQL 16**（docker 容器，宿主机端口 **5434**）
迁移工具：**Flyway 11.7.2**（`flyway-core` + `flyway-database-postgresql`）
脚本位置：`backend/nowpass-admin/src/main/resources/db/migration/`

## 1. 约定

| 约定 | 说明 |
|---|---|
| 主键 | 统一 `bigserial`（Exposed 侧 `long("id").autoIncrement()`） |
| 逻辑删除 | 统一 `deleted boolean not null default false`；唯一约束用**部分唯一索引**（`where deleted = false`）规避软删冲突 |
| 时间 | 统一 `timestamptz` |
| 审计字段 | `create_by / create_time / update_by / update_time`（Exposed 侧由 `AuditSupport` 自动填充） |
| 命名 | 表名小写下划线；索引 `idx_`、唯一索引 `uk_`、检查约束 `ck_` |
| 迁移 | `V{序号}__{描述}.sql`，**已执行过的脚本永不修改**，变更一律新增版本 |

## 2. 表清单

| 表 | 作用 | 备注 |
|---|---|---|
| `sys_user` | 用户（前台用户与管理共用一张表） | `status`: `pending` / `active` / `disabled` |
| `sys_role` | 角色（固定三个，Flyway 初始化） | `superadmin` / `admin` / `user` |
| `sys_user_role` | 用户-角色关联 | 联合主键 |
| `question_category` | 题目分类（单层） | 不做树形 |
| `question` | 面试题 + 标准答案 | `options jsonb`、`tags text[]` |
| `sys_oper_log` | 操作日志 | 只读查询用途，不存业务数据 |
| `question_major_category` | 题库大类 | 分类通过 `major_category_id` 归属大类 |
| `user_favorite` | 用户收藏 | 联合主键 `(user_id, question_id)` |
| `user_question_progress` | 刷题记录 | 看过次数、是否揭晓答案、自评掌握度 |
| `interview_session` | AI 面试场次 | 结束时写 `report_md` |
| `interview_message` | 面试对话 | 按 id 升序还原对话 |

## 3. 关键字段说明

### sys_user

| 字段 | 类型 | 说明 |
|---|---|---|
| `username` | varchar(30) | 部分唯一索引，软删后可复用 |
| `password` | varchar(100) | **BCrypt** 哈希 |
| `email` | varchar(100) | 部分唯一索引，注册与找回密码依赖它 |
| `status` | varchar(10) | `pending` 待审批 → `active` 正常；`disabled` 停用 |

> 初始管理员**不在 SQL 里插入**：BCrypt 哈希无法在迁移脚本里可靠维护。改由 `AdminInitializer` 在启动时幂等创建（用户名/密码取 `nowpass.init.admin-*`），并授予 `superadmin` 角色。

### question

| 字段 | 类型 | 说明 |
|---|---|---|
| `category_id` | bigint | 外键 → `question_category.id` |
| `difficulty` | varchar(10) | `easy` / `medium` / `hard`（check 约束） |
| `title` | varchar(200) | 列表页展示 |
| `content_md` | text | 题干，Markdown(GFM) |
| `answer_md` | text | **标准答案**，Markdown(GFM)，仅通过独立接口返回 |
| `options` | jsonb | `[{"key":"A","text":"..."}]`；简答题为 `null` |
| `answer_key` | varchar(20) | 选择题 `B` / `AC`；简答题为 `null` |
| `tags` | text[] | 默认 `{}` |

**为什么用 `jsonb` 而不是 `question_option` 表**：选项永远跟着题目整体读、整体写，没有"按选项查询"的需求；独立表要多一次 join 与排序字段。同理由：标签用 `text[]` 而非 `question_tag` + 关联表。

## 4. 索引与查询

| 索引 | 用途 |
|---|---|
| `uk_sys_user_username` / `uk_sys_user_email` | 登录、注册查重（部分唯一） |
| `idx_sys_user_status` | 后台"待审批"筛选 |
| `idx_question_category` / `idx_question_difficulty` | 列表筛选 |
| `idx_question_tags` (GIN) | `tags @> array['java']` 标签筛选 |
| `idx_question_title_trgm` (GIN, pg_trgm) | `title ILIKE '%关键词%'` 模糊搜索（否则全表扫描） |
| `idx_sys_oper_log_time` | 日志按时间倒序翻页 |

## 5. 初始化数据（V2）

- 3 个角色：`superadmin` / `admin` / `user`
- 6 个分类：Java 基础 / JVM / 数据库 / 计算机网络 / Kotlin / Spring
- 9 道示例题（2 道选择题含 `options` + `answer_key`，7 道简答题）

> 示例数据用于接口联调验证，正式使用可在后台删除或改写。

## 6. 本地端口

| 服务 | 宿主机端口 | 容器端口 | 说明 |
|---|---|---|---|
| PostgreSQL | **5434** | 5432 | 5432 被本机 PostgreSQL 18 占用，5433 被另一个项目的容器占用 |
| Redis | 6379 | 6379 | — |
| Mailpit SMTP | 1025 | 1025 | — |
| Mailpit Web | 8025 | 8025 | 建议用 `http://127.0.0.1:8025`（`localhost` 在本机可能解析到 ::1 导致超时） |
| 应用 | **18090** | — | 8080、8090 均被本机其它项目占用 |
