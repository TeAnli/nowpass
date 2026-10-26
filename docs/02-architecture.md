# 架构说明

## 1. 模块划分与依赖方向

```
nowpass-admin      接口层：Controller、启动类、Flyway 脚本、打包
      ↓
nowpass-framework  框架层：Exposed 事务、鉴权、验证码、限流、操作日志、邮件
      ↓
nowpass-system     领域层：Table 定义、DAO、Service、领域模型
      ↓
nowpass-common     通用层：R / PageResult / ErrorCode / 注解 / 常量（纯 Kotlin）
```

**依赖严格单向**：`common` 不反向依赖任何模块。这条由编译器保证，不是靠自律。

| 模块 | 允许放什么 | 禁止放什么 |
|---|---|---|
| `common` | 与框架无关的纯 Kotlin 类型 | servlet、Spring Bean、数据库访问 |
| `system` | Exposed Table / DAO / Service / 领域模型 | 安全实现（密码编码、token）、HTTP 相关代码 |
| `framework` | Spring 配置、过滤器、AOP、Redis、邮件 | Controller |
| `admin` | Controller、请求 DTO、OpenAPI 配置 | 领域逻辑（一律下沉到 service） |

## 2. 一次请求的处理链路

```
HTTP 请求
  → AuthTokenFilter                     读 Authorization: Bearer <tokenId>
      → TokenService.load              Redis GET login_tokens:<id> → LoginUser
      → 滑动续期（剩余 < 60 分钟时刷新，回写 X-Token-Expire-At 响应头）
      → SecurityContext 注入权限点
  → RateLimiterAspect（敏感端点）       Redis Lua INCR + EXPIRE 固定窗口
  → Spring Security 授权               认证 + @PreAuthorize 权限点
  → Controller
  → Service（@Transactional）          Exposed DSL，SpringTransactionManager 提供事务
  → OperLogAspect（@Log）              REQUIRES_NEW 独立事务落 sys_oper_log
  → GlobalExceptionHandler             异常 → 统一 R 结构
```

## 3. 分层职责的具体约定

### Controller（`nowpass-admin`）

- 只做三件事：**取参数 → 调 service → 包 `R`**，不写业务判断
- 权限点用 `@PreAuthorize("hasAuthority('...')")`，字符串来自 `Permissions` 常量
- 写操作加 `@Log(title, businessType)`
- 敏感端点加 `@RateLimiter`

### Service（`nowpass-system` / `nowpass-framework`）

- **业务校验前置**：如"选择题必须同时有选项与答案键"、"分类下有题目不许删"
- 事务边界在 service 方法上（`@Transactional`），不在 DAO 上
- 密码相关逻辑放 `framework`（`AuthService` / `UserAdminService`），`system` 只存已编码密码

### DAO（`nowpass-system`）

- Exposed DSL 直写，**没有 XML**
- 逻辑删除统一在 DAO 层显式过滤 `deleted = false`
- 列表页需要关联数据时，先分页查主表，再按 id 批量查关联（避免 N+1）

## 4. 为什么不用 Repository 抽象

Exposed 的 DSL 本身就是类型安全的查询构造器，再加一层 `Repository<T>` 只会把表达式藏起来。
这里的 DAO 是"一组具名查询方法"，比通用 Repository 更能表达业务意图（例如 `idsByTag` 这种
必须走原生 SQL 的地方，通用抽象根本表达不了）。

## 5. 关键取舍记录

| 取舍 | 选择 | 影响 |
|---|---|---|
| 会话存储 | Redis 有状态 token | 可即时强退/可枚举在线用户；每请求一次 Redis 往返 |
| 权限模型 | 权限点写进代码 | 可编译期检查、评审一眼看全；新增权限需发版 |
| 表结构 | Flyway 独占 | 迁移可追溯；Exposed 只读不写 DDL，禁止 `createMissingTables` |
| 领域模型 | 列表/详情/答案三种 DTO 分离 | 长文本不随列表搬运，答案不会被误返回 |
