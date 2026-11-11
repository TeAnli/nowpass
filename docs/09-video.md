# 视频讲解

`/videos` 是独立的面试视频讲解库。视频文件和封面存 MinIO 私有桶，数据库只保存元数据与 object key；用户登录后可浏览已发布视频，管理员在后台创建草稿、直传、预览和发布。

## 1. 页面

| 路由 | 说明 |
|---|---|
| `/videos` | 视频列表，分类/标签/关键词筛选，每页 12 条 |
| `/videos/:id` | 播放页，标题信息在播放器上方，单列布局；原生进度/倍速记忆，支持弹幕与评论 |
| `/admin/videos` | 后台视频管理 |
| `/admin/video-categories` | 后台视频分类管理 |

封面缺失时显示深青纸面渐变占位卡，不自动截帧。

## 播放器

自定义播放器替代原生 controls：

- 播放/暂停、可拖拽进度条、缓冲进度、时间
- 进度条支持指针拖拽、悬停时间预览、双击回到开头
- 音量滑杆与静音，采用 MD3 药丸滑块；调节时播放器右上角显示音量 HUD（图标、百分比、音量条），持续操作时保持显示，停止约 1.8 秒后淡出
- 0.5× / 0.75× / 1× / 1.25× / 1.5× / 2× 倍速
- 设置面板：倍速、记住播放位置开关、恢复默认音量与倍速
- 宽屏模式：隐藏侧栏，播放器扩展到 1680px 内容宽度
- 全屏模式
- 快捷键：
  - `Space` / `K` 播放暂停
  - `←` 后退 5 秒
  - `→` 前进 5 秒；长按 `→` 约 450ms 后临时 2× 快进，松开恢复
  - `↑` / `↓` 音量 ±10%
  - `M` 静音
  - `F` 全屏
  - `W` 宽屏
  - `/` 快捷键说明
- 按住鼠标右键或长按 `→` **约 450ms** 后临时 2× 快进，松开恢复原倍速；短按不触发加速，浏览器右键菜单被阻止
- 播放进度与倍速、音量、静音状态存 `localStorage`
- 弹幕层按视频时间点叠加，支持滚动、顶部固定和底部固定三种位置；暂停时动画暂停
- 播放器下方可发送当前时间点弹幕，按 Enter 或点击发送

## 2. 数据

- `video_category`：独立分类，`name` + `sort`
- `video`：标题、简介、讲师、分类、可空 `question_id`、`tags text[]`、视频/封面 object key、时长、大小、状态
- `video_comment`：视频评论，软删除，记录作者与时间
- `video_danmaku`：时间点弹幕，`time_ms`、颜色、位置（`scroll` / `top` / `bottom`）
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
| GET | `/api/videos/{id}/comments?page=&pageSize=` |
| POST | `/api/videos/{id}/comments` |
| DELETE | `/api/videos/{id}/comments/{commentId}` |
| GET | `/api/videos/{id}/danmaku` |
| POST | `/api/videos/{id}/danmaku` |

互动规则：

- 评论最多 500 字，弹幕最多 60 字
- 评论仅登录用户可发表，本人或管理员可删除
- 弹幕支持 `scroll`、`top`、`bottom`，颜色为 `#RRGGBB`
- 评论限流 8 次/分钟，弹幕限流 20 次/分钟

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
