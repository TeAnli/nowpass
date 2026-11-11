# 开发与运维手册

## 1. 环境要求

| 组件 | 版本 | 说明 |
|---|---|---|
| JDK | 21 | `JAVA_HOME` 必须指向 21；本机 PATH 上可能是别的版本 |
| Gradle | 8.14.4 | Wrapper 位于 `backend/`，在 `backend` 目录执行 `./gradlew` |
| Docker | 任意 | 用于 PostgreSQL / Redis / Mailpit |
| Kotlin | 2.3.21 | 由 Gradle 插件管理，无需单独安装 |

> 本机实测：`D:\Program Files\Java\jdk-21`。若 `JAVA_HOME` 指向 17，Gradle 会按 toolchain 再找 21，
> 但为避免混淆，运行前显式设置。

## 2. 启动步骤

以下命令从仓库根目录开始。首次运行先复制环境变量模板。

```powershell
# 0) 准备环境变量
Copy-Item .env.example .env

# 1) 设置 JDK
$env:JAVA_HOME = 'D:\Program Files\Java\jdk-21'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# 2) 起中间件（PostgreSQL 5434 / Redis 6379 / Mailpit 1025+8025）
pnpm docker:up

# 3) 构建（含单元测试）
cd backend
./gradlew build

# 4) 运行
./gradlew :nowpass-admin:bootRun
# 或者
java -jar nowpass-admin/build/libs/nowpass.jar
```

启动后：

- 接口文档：<http://127.0.0.1:18090/swagger-ui.html>
- 邮件收件箱：<http://127.0.0.1:8025>（用 `127.0.0.1`，`localhost` 可能解析到 ::1 而超时）
- 默认超管：`admin` / `Admin@123456`（首次登录后请立即改密）

## 3. 端口一览（都是被迫选的）

| 服务 | 端口 | 为什么不是默认值 |
|---|---|---|
| 应用 | **18090** | 8080、8090 均被本机其它项目间歇性占用 |
| PostgreSQL | **5434** | 5432 是本机 PostgreSQL 18，5433 是另一项目的容器 |
| Redis | 6379 | 空闲，用默认 |
| Mailpit SMTP / Web | 1025 / 8025 | 默认 |

## 4. 常见操作

```powershell
# 看 Redis 会话
docker exec nowpass-redis redis-cli --scan --pattern 'login_tokens:*'

# 取图形验证码答案（联调用）
docker exec nowpass-redis redis-cli get "captcha:<uuid>"

# 取邮箱验证码（nowpass.mail.enabled=false 时也会打到日志）
docker exec nowpass-redis redis-cli get "email_code:register:<email>"

# 清除登录失败锁定 / 限流计数
docker exec nowpass-redis redis-cli del "pwd_lock:<username>"
docker exec nowpass-redis redis-cli --scan --pattern 'rate_limit:*'

# 进数据库
docker exec -it nowpass-postgres psql -U nowpass -d nowpass

# 重跑迁移（危险：会清库）
docker compose -f infra/docker-compose.yml --env-file .env down -v
pnpm docker:up
```

## 5. 数据库迁移约定

1. 脚本放在 `backend/nowpass-admin/src/main/resources/db/migration/`，命名 `V{序号}__{描述}.sql`
2. **已执行过的脚本永不修改**，任何变更都新增版本号
3. **Exposed 不负责建表**：不要打开 `createMissingTables`，表结构归 Flyway
4. 改表后同步更新 `docs/03-database.md` 与对应的 Exposed `Table` 对象

## 6. 提交规范

采用 Conventional Commits：

```
feat(system): 题库领域层 domain/dao/service
fix(framework): 修正 token 反序列化缺失 KotlinModule
docs(api): 补充接口文档
chore: 调整依赖源
```

每次提交同步更新 `CHANGELOG.md`（按版本分段：新增 / 变更 / 修复 / 验证）。

## 7. 踩过的坑（都是真踩出来的）

| 现象 | 原因 | 处理 |
|---|---|---|
| `Unclosed comment` 编译错误 | **Kotlin 块注释可嵌套**，KDoc 里写 `/api/**` 会开启新注释 | 注释中避免双星号路径 |
| 所有受保护接口 401，日志报 `no Creators, like default constructor` | 缺 `jackson-module-kotlin`，Kotlin data class 无法反序列化 | `framework` 显式引入该依赖 |
| `Table.options` 冲突 | Exposed `Table` 自带 `options` 成员 | jsonb 列属性改名 `optionJson`，列名仍是 `options` |
| `and` / `andWhere` 找不到 | 1.6 拆包：`and` 在 `v1.core`，`andWhere` 在 `v1.jdbc` | 分别 import |
| 中文写库变 `??????` | PowerShell 默认编码，不是应用问题 | 显式发 UTF-8 字节验证 |
| Gradle 发行包下载 0 字节 | 官方源不稳定 | 用镜像预置到 `~/.gradle/wrapper/dists`，仓库里 `distributionUrl` 保持官方 |
| 5432/5433/8080/8090 端口冲突 | 本机其它项目占用 | 统一改到 5434 / 18090，见第 3 节 |

## 8. 已知取舍：Spring Boot 3.5.16 已结束 OSS 支持

Spring Boot 3.5.x 的**开源支持已于 2026-06-30 结束**，3.5.16 是最后一个开源补丁，后续不再有 CVE 修复。

- **为什么仍选它**：升到 Boot 4 会连带 Jackson 3、springdoc 3.x、`exposed-spring-boot4-starter`
  一整套未验证面，对"少数人自用"的站点，交付确定性优先于版本新鲜度。
- **升级路径**（将来要做时）：
  1. Spring Boot 4.x + Gradle 9.x
  2. Exposed 改用 `exposed-spring-boot4-starter`（官方已明确 Boot 3 集成会在下个大版本移除）
  3. springdoc 换 3.x
  4. Jackson 2 → 3，注意注解包名与 `ObjectMapper` 配置迁移

## 9. 测试策略

当前只有两类单元测试（不引 Testcontainers / CI）：

- `ArithmeticGeneratorTest`：验证码生成与校验的纯逻辑
- `RolePermissionsTest`：角色到权限点的映射边界（普通用户零权限、admin 不含危险操作）

集成链路靠 `http/nowpass.http` 手工回归 + Swagger UI 点选验证。
