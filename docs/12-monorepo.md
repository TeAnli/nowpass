# Monorepo 结构

## 1. 为什么把 Gradle 放进 `backend/`

NowPass 是 Kotlin 后端 + React 前端的混合仓库。Gradle Wrapper、`settings.gradle.kts` 和 `build.gradle.kts` 都属于后端构建，不应该占据仓库根目录。

现在 `backend/` 是一个自包含的 Gradle 多项目构建：

```text
backend/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── gradle/
├── gradlew
├── gradlew.bat
├── nowpass-admin/       # Spring Boot 入口
├── nowpass-common/      # 纯 Kotlin 通用类型
├── nowpass-framework/   # Spring 基础设施
├── nowpass-system/      # 领域模型、DAO、Service
└── http/nowpass.http
```

根目录只保留跨技术栈的编排文件：

```text
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
README.md
.dockerignore          # 必须留在构建上下文根目录
```

## 2. 整体目录

```text
nowpass/
├── backend/                # Gradle 根 + 后端
│   ├── nowpass-admin/      # Controller、启动类、Flyway、打包
│   ├── nowpass-common/     # 纯 Kotlin 通用类型
│   ├── nowpass-framework/  # Spring 基础设施
│   ├── nowpass-system/     # 领域模型、DAO、Service
│   └── http/
├── frontend/               # React SPA
├── packages/
│   └── api-contracts/      # 跨应用共享 TypeScript 类型
├── infra/
│   ├── docker/             # backend/frontend Dockerfile
│   ├── openresty/          # OpenResty 配置
│   └── docker-compose.yml  # 中间件与全栈容器入口
├── docs/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── .dockerignore
```

## 3. 依赖方向

```text
backend/nowpass-admin
  -> backend/nowpass-framework
    -> backend/nowpass-system
      -> backend/nowpass-common
```

规则：

- `nowpass-common` 不依赖任何后端模块
- `nowpass-system` 只依赖 `nowpass-common`
- `nowpass-framework` 依赖 `nowpass-system`
- `nowpass-admin` 依赖 `nowpass-framework`
- `frontend` 只依赖 `@nowpass/api-contracts` 的类型，不直接引用后端源码

## 4. 新代码放哪里

| 要加的东西 | 位置 |
|---|---|
| 新 Controller / 请求 DTO | `backend/nowpass-admin` |
| 新业务 Service / DAO / Table | `backend/nowpass-system` |
| 安全、Redis、邮件、AOP、框架配置 | `backend/nowpass-framework` |
| 纯 Kotlin 工具类型、统一响应、错误码 | `backend/nowpass-common` |
| 新页面、组件、样式 | `frontend/src` |
| 前后端共享的接口类型 | `packages/api-contracts` |
| Dockerfile、OpenResty | `infra` |
| 设计、运维、接口文档 | `docs` |

不要把业务逻辑写进 `backend/nowpass-admin`，也不要把 React 组件放进 `packages/api-contracts`。

## 5. 常用命令

### 后端

```bash
cd backend
./gradlew build
./gradlew :nowpass-admin:bootRun
./gradlew :nowpass-admin:bootJar
```

产物：`backend/nowpass-admin/build/libs/nowpass.jar`

### 前端

```bash
pnpm install
pnpm dev:web
pnpm build:web
pnpm typecheck:web
pnpm lint:web
```

### Docker

```bash
pnpm docker:up
pnpm docker:app
```

也可以直接执行：

```bash
docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d --build
```

## 6. 共享契约

`packages/api-contracts` 目前存放前端使用的 TypeScript 接口类型。它只包含类型声明，不包含运行时逻辑。

如果以后新增第二个前端应用，可以直接依赖同一个包，避免复制 `types/api.ts`。

## 7. 注意事项

- Gradle 命令必须在 `backend/` 下执行，根目录不再有 `gradlew`
- `pnpm install` 必须在仓库根目录执行，只保留一份 lockfile
- Compose 文件在 `infra/docker-compose.yml`，构建上下文是仓库根目录
- 前端容器使用 OpenResty 提供静态资源与 `/api/` 反向代理
- `.dockerignore` 必须留在仓库根目录，Docker 只读取构建上下文根目录的忽略文件
- 修改 Flyway 脚本时路径为 `backend/nowpass-admin/src/main/resources/db/migration/`
- IDE 需要把 `backend` 作为 Gradle 工程重新导入
