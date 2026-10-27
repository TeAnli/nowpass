# 全栈 Docker 运行

项目支持两种模式，互不影响：

| 模式 | 启动内容 | 适用场景 |
|---|---|---|
| 开发模式（默认） | 仅 PostgreSQL / Redis / Mailpit 容器，前后端跑在宿主机 | 日常开发、Vite 热更新、断点调试 |
| 全栈模式（`app` profile） | PostgreSQL / Redis / Mailpit + 后端 + Nginx 前端 | 一键演示、联调、预发布 |

## 1. 开发模式

```bash
docker compose up -d          # 只启动中间件
cd frontend && pnpm dev       # 前端 http://127.0.0.1:5173
java -jar nowpass-admin/build/libs/nowpass.jar   # 后端 http://127.0.0.1:18090
```

## 2. 全栈模式

```bash
# 首次构建镜像
docker compose --profile app up -d --build

# 已构建过，只启动
docker compose --profile app up -d

# 查看状态与日志
docker compose --profile app ps
docker compose --profile app logs -f backend frontend

# 停止应用，保留中间件
docker compose --profile app stop backend frontend

# 全部停止（保留数据卷）
docker compose --profile app down
```

访问地址：

- 前端（Nginx）：http://127.0.0.1:8088
- 后端（直连调试）：http://127.0.0.1:18090
- Swagger：http://127.0.0.1:18090/swagger-ui.html
- Mailpit：http://127.0.0.1:8025

> 全栈模式会占用 `18090`，启动前先停止宿主机上的后端进程；开发前端 `5173` 与容器前端 `8088` 可以同时存在。

## 3. 镜像结构

### 后端：`Dockerfile`

- 构建阶段：`gradle:8.14.4-jdk21`，执行 `:nowpass-admin:bootJar`
- 运行阶段：`eclipse-temurin:21-jre-alpine`，非 root 用户
- 健康检查：`GET /api/auth/captcha`
- JVM 内存：`-XX:MaxRAMPercentage=75`

### 前端：`frontend/Dockerfile`

- 构建阶段：`node:22-alpine` + pnpm，执行 `pnpm build`
- 运行阶段：`nginx:1.27-alpine`
- `frontend/deploy/nginx.conf` 负责：
  - `/api/` 反代到 `backend:18090`
  - React Router history 回退到 `index.html`
  - 静态资源 30 天缓存与 gzip

前后端同源，因此生产环境不需要开启 CORS。

## 4. 容器内配置

`docker-compose.yml` 通过环境变量覆盖 `application.yml`：

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
- `docker compose down` 不会删除数据
- `docker compose down -v` **会删除数据库和 Redis 数据**，需要重新迁移并等管理员重新初始化
- 改了后端代码后：`docker compose --profile app up -d --build backend`
- 改了前端代码后：`docker compose --profile app up -d --build frontend`

## 6. 生产前建议

1. 删除 backend 的 `ports`，只让 Nginx 对外暴露 80/443；后端走容器网络。
2. 数据库、Redis、Mailpit 不对外发布端口。
3. 数据库密码、管理员初始密码、SMTP 授权码全部改成 Secret。
4. 关闭 `springdoc`、把 `com.nowpass` 日志级别从 `debug` 调成 `info`。
5. Nginx 前置 TLS，并补 `server.forward-headers-strategy=framework`。
6. 为 `nowpass-pgdata` 做备份；当前只有容器健康检查，没有自动备份。
