# 全栈 Docker 运行

项目支持两种模式，互不影响：

| 模式 | 启动内容 | 适用场景 |
|---|---|---|
| 开发模式（默认） | 仅 PostgreSQL / Redis / Mailpit 容器，前后端跑在宿主机 | 日常开发、Vite 热更新、断点调试 |
| 全栈模式（`app` profile） | PostgreSQL / Redis / Mailpit + 后端 + OpenResty 前端 | 一键演示、联调、预发布 |

## 1. 开发模式

```bash
cp .env.example .env          # 首次运行
pnpm docker:up                # 只启动中间件
pnpm dev:web                  # 前端 http://127.0.0.1:5173
cd backend && ./gradlew :nowpass-admin:bootRun   # 后端 http://127.0.0.1:18090
```

Compose 文件在 `infra/docker-compose.yml`，根目录脚本已经封装好 `-f` 与 `--env-file .env`。

## 2. 全栈模式

```bash
# 首次构建镜像
pnpm docker:app

# 或手动执行
docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d --build

# 已构建过，只启动
docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d

# 查看状态与日志
docker compose -f infra/docker-compose.yml --env-file .env --profile app ps
docker compose -f infra/docker-compose.yml --env-file .env --profile app logs -f backend frontend

# 停止应用，保留中间件
docker compose -f infra/docker-compose.yml --env-file .env --profile app stop backend frontend

# 全部停止（保留数据卷）
pnpm docker:down
```

访问地址：

- 前端（OpenResty）：http://127.0.0.1:8088
- 后端（直连调试）：http://127.0.0.1:18090
- Swagger：http://127.0.0.1:18090/swagger-ui.html
- Mailpit：http://127.0.0.1:8025
- MinIO API：http://127.0.0.1:9002
- MinIO 控制台：http://127.0.0.1:9003
- MinIO 本地账号：`minioadmin / minioadmin`，桶由后端启动时自动创建

> 全栈模式会占用 `18090`，启动前先停止宿主机上的后端进程；开发前端 `5173` 与容器前端 `8088` 可以同时存在。
> 本机 `9000/9001` 已被其它项目占用，因此 NowPass MinIO 使用 `9002/9003`；容器内部仍是 `9000/9001`。

## 3. 镜像结构

### 后端：`infra/docker/backend.Dockerfile`

- 构建上下文：仓库根目录
- 构建阶段：`gradle:8.14.4-jdk21`，在 `backend/` 执行 `:nowpass-admin:bootJar`
- 运行阶段：`eclipse-temurin:21-jre-alpine`，非 root 用户
- 健康检查：`GET /api/auth/captcha`
- JVM 内存：`-XX:MaxRAMPercentage=75`

### 前端：`infra/docker/frontend.Dockerfile`

- 构建上下文：仓库根目录
- 构建阶段：`node:22-alpine` + pnpm workspace，执行 `pnpm --filter @nowpass/web build`
- 运行阶段：`openresty/openresty:1.27.1.2-alpine`
- `infra/openresty/default.conf` 负责：
  - `/api/` 反代到 `backend:18090`
  - React Router history 回退到 `index.html`
  - 静态资源 30 天缓存与 gzip

前后端同源，因此生产环境不需要开启 CORS。

## 4. 容器内配置

`infra/docker-compose.yml` 通过环境变量覆盖 `application.yml`：

| 变量 | 容器内值 |
|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://postgres:5432/nowpass` |
| `SPRING_DATA_REDIS_HOST` | `redis` |
| `SPRING_MAIL_HOST` | `mailpit` |
| `NOWPASS_MAIL_ENABLED` | `true` |

邮件默认仍写入 Mailpit。切换 QQ SMTP 时，把 `backend.environment` 改为真实 SMTP 配置，并把授权码放在 `.env` 或部署平台 Secret 中，不要写进 Git：

```yaml
SPRING_MAIL_HOST: smtp.qq.com
SPRING_MAIL_PORT: "465"
SPRING_MAIL_USERNAME: your-qq@qq.com
SPRING_MAIL_PASSWORD: ${QQ_SMTP_AUTH_CODE}
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH: "true"
SPRING_MAIL_PROPERTIES_MAIL_SMTP_SSL_ENABLE: "true"
NOWPASS_MAIL_ENABLED: "true"
NOWPASS_MAIL_FROM: "NowPass <your-qq@qq.com>"
```

## 5. 数据与重建

- 数据卷：`nowpass-pgdata`、`nowpass-redisdata`
- `docker compose -f infra/docker-compose.yml --env-file .env down` 不会删除数据
- `docker compose -f infra/docker-compose.yml --env-file .env down -v` **会删除数据库和 Redis 数据**，需要重新迁移并等管理员重新初始化
- 改了后端代码后：`docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d --build backend`
- 改了前端代码后：`docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d --build frontend`

## 6. 生产前建议

1. 删除 backend 的 `ports`，只让 OpenResty 对外暴露 80/443；后端走容器网络。
2. 数据库、Redis、Mailpit 不对外发布端口。
3. 数据库密码、管理员初始密码、SMTP 授权码全部改成 Secret。
4. 关闭 `springdoc`、把 `com.nowpass` 日志级别从 `debug` 调成 `info`。
5. OpenResty 前置 TLS，并补 `server.forward-headers-strategy=framework`。
6. 为 `nowpass-pgdata` 做备份；当前只有容器健康检查，没有自动备份。
