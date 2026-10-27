# 视频讲解

`/videos` 是独立的面试视频讲解库。视频文件和封面存 MinIO 私有桶，数据库只保存元数据与 object key；用户登录后可浏览已发布视频，管理员在后台创建草稿、直传、预览和发布。

## 1. 页面

| 路由 | 说明 |
|---|---|
| `/videos` | 视频列表，分类/标签/关键词筛选，每页 12 条 |
| `/videos/:id` | 播放页，原生播放器、进度记忆、倍速记忆、关联题目 |
| `/admin/videos` | 后台视频管理 |
| `/admin/video-categories` | 后台视频分类管理 |

封面缺失时显示深青纸面渐变占位卡，不自动截帧。

## 2. 数据

- `video_category`：独立分类，`name` + `sort`
- `video`：标题、简介、讲师、分类、可空 `question_id`、`tags text[]`、视频/封面 object key、时长、大小、状态
- 状态：`draft` / `published` / `offline`
- 分类下有视频时拒绝删除
- 删除为软删除，对象延迟清理

## 3. MinIO

- 私有桶：`nowpass-media`
- 对象路径：
  - `videos/{videoId}/{uuid}.mp4`
  - `covers/{videoId}/{uuid}.jpg`
- 本地宿主机端口：
  - API：`9002` -> 容器 `9000`
  - 控制台：`9003` -> 容器 `9001`
  - 原因：本机 `9000/9001` 已被另一个项目占用
- 本地账号：`minioadmin / minioadmin`
- 后端启动时自动建桶；不依赖额外的 `mc` 容器

环境变量：

| 变量 | 默认值 |
|---|---|
| `MINIO_ENDPOINT` | `http://localhost:9000`（Docker 内为 `http://minio:9000`） |
| `MINIO_PUBLIC_ENDPOINT` | `http://127.0.0.1:9002` |
| `MINIO_ACCESS_KEY` | `minioadmin` |
| `MINIO_SECRET_KEY` | `minioadmin` |
| `MINIO_BUCKET` | `nowpass-media` |

浏览器必须能访问 `MINIO_PUBLIC_ENDPOINT`。预签名 URL 中的 host 就是公开 endpoint，不能事后替换。

CORS 由 MinIO 的 `MINIO_API_CORS_ALLOW_ORIGIN` 配置，默认允许 `127.0.0.1:8088`、`localhost:8088` 与 Vite `5173`。生产环境改成实际前端域名。

## 4. 上传流程

1. 管理员填写元数据，创建 `draft`
2. 后端签发视频/封面预签名 PUT
3. 浏览器 XHR 直传 MinIO，显示进度
4. 后端 `statObject` 校验对象存在、大小、Content-Type
5. 管理员预览草稿
6. 发布为 `published`

限制：

- MP4（H.264/AAC），单文件 ≤ 500MB、≤ 30 分钟
- 封面 JPG/PNG/WebP，≤ 5MB，16:9
- 同一时间只允许一个上传任务
- 上传中离开页面会提示
- 替换视频/封面后回到 `draft`
- 播放签名有效期 2 小时；403 时刷新详情页重新签发

## 5. API

用户端（登录后可用）：

| 方法 | 路径 |
|---|---|
| GET | `/api/videos?page=&pageSize=&categoryId=&tag=&keyword=` |
| GET | `/api/videos/categories` |
| GET | `/api/videos/tags` |
| GET | `/api/videos/{id}` |
| GET | `/api/videos/{id}/play` |

后台：

| 方法 | 路径 | 权限 |
|---|---|---|
| GET/POST | `/api/admin/videos` | `video:list` / `video:add` |
| GET/PUT/DELETE | `/api/admin/videos/{id}` | `video:query` / `video:edit` / `video:remove` |
| POST | `/api/admin/videos/{id}/upload-url` | `video:edit` |
| POST | `/api/admin/videos/{id}/finalize` | `video:edit` |
| POST | `/api/admin/videos/{id}/publish` | `video:publish` |
| POST | `/api/admin/videos/{id}/offline` | `video:publish` |
| GET | `/api/admin/videos/{id}/preview-url` | `video:query` |
| POST | `/api/admin/videos/cleanup` | `video:edit` |
| CRUD | `/api/admin/video-categories` | `video:category:*` |

## 6. 清理

- 元数据软删除
- 每日 03:30 清理：
  - 超过 24 小时未 finalize 的草稿
  - 超过 24 小时已软删除记录
  - MinIO 中无数据库引用且超过 24 小时的对象
- 后台“清理孤儿”可立即执行

## 7. 已知限制

- 不做转码、HLS、多清晰度、字幕、DRM
- 不做服务端播放量/观看记录；进度与倍速存 `localStorage`
- 视频时长由浏览器读取文件元数据后上报，后端只校验大小和 MIME
- 标签过滤在内存完成，适合当前 <200 条规模
