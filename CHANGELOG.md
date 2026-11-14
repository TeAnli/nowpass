# 变更日志

本项目所有重要变更记录在此文件。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中
- 前端真实接口联调（需先启动 `pnpm docker:up`）
- 生产部署时将 `frontend/dist` 打包进后端静态资源

## [0.31.0] - 2026-11-14

### 新增
- 智能体展示「思考链」：默认折叠，可展开查看每一步工具调用，单步还能再展开看参数与结果
- 新增 `present_table` 工具：模型把多条数据以结构化表格返回，前端用 Ant Design Table 渲染
- 待确认动作改为自定义卡片：工具图标、标题、摘要与工具名标签
- 执行结果改为自定义列表，成功/失败分别着色

### 变更
- 智能体回复正文改为纯文本渲染，不再走 Markdown，避免出现 Markdown 表格与符号列表
- 提示词更新：列数据必须用 `present_table`，正文控制在 120 字内
- `AgentReply` 增加 `steps` 与 `tables` 字段
- `V19__agent_table_prompt.sql`：更新 `agent_system` 提示词

### 验证
- 后端 `clean build`（含单测）通过，V19 迁移成功
- 接口返回：`tables` 1 张（列「分类 id / 分类名 / 题目数量」，5 行）、`steps` 2 步（list_categories → present_table）
- 真实 UI 交互：点示例 → 渲染 5 行 2 列表格、思考链展开 2 步、回复正文无 Markdown
- 前端 typecheck / lint / build 通过，容器 healthy

## [0.30.0] - 2026-11-14

### 新增
- 后台「AI 智能体」页 `/admin/agent`：用自然语言查询与维护数据
- 工具集：`stats_overview`、`search_questions`、`list_categories`（只读）；`create_question`、`delete_question`、`create_category`、`publish_video`、`offline_video`（写）
- 写操作两段式：对话只生成待确认动作，`/execute` 确认后才落库
- `agent_action_log` 审计表：记录用户、工具、参数与结果
- `V18__agent_admin.sql`：审计表、`agent` 用量场景、`agent_system` 提示词

### 变更
- `ai_usage_log` 场景约束扩展为 `interview` / `support` / `agent`
- 智能体提示词可在 AI 管理页编辑

### 验证
- 后端 `clean build`（含单测）通过，V18 迁移成功
- 只读：统计返回 131 题 / 43 分类；搜索正确返回题目 id
- 写操作：对话只返回 1 条待确认动作，题库数量不变
- 执行：返回 200「已创建题目 id=133」，题库 131 → 132，审计记录成功
- 用量场景统计出现 `agent`
- `/admin/agent` 渲染正常，后台导航含「AI 智能体」
- 前端 typecheck / lint / build 通过，容器 healthy

## [0.29.0] - 2026-11-14

### 新增
- AI 后台管理页 `/admin/ai`：模型与 TTS 状态、调用汇总、提示词编辑、最近调用明细
- 提示词落库（`ai_prompt`），改文案不再需要发版；面试官与客服各一套
- AI 调用用量记录（`ai_usage_log`）：场景、模型、用户、成功与否、输入输出字数、耗时
- AI 客服：用户端右下角悬浮入口，基于站点知识回答使用问题，带快捷提问
- 新增权限点 `ai:view` / `ai:edit`
- `V17__ai_admin.sql`：`ai_prompt`、`ai_usage_log` 与两套初始提示词

### 变更
- `AiInterviewService` 改为读取数据库提示词，缺失时回退内置文案；每次调用写入用量
- 面试对话接口增加 `userId` 参数，用于用量归属

### 验证
- 后端 `clean build`（含单元测试）通过，V17 迁移成功
- `/api/admin/ai/overview` 返回 deepseek + TTS 已启用（知小夏）
- `/api/admin/ai/prompts` 返回 `interview_system`、`support_system`
- `/api/support/chat` 真实模型回答成功，用量从 0 增至 1（avg 1306ms）
- `/admin/ai` 与首页客服悬浮按钮渲染正常
- 前端 typecheck / lint / build 通过，容器 healthy

## [0.28.0] - 2026-11-14

### 新增
- 题目收藏：详情页收藏按钮、收藏状态查询、取消收藏
- 刷题记录：打开题目自动记录、揭晓答案打点、答案下方自评掌握度（会 / 模糊 / 不会）
- AI 面试历史：场次、逐轮对话、结束点评全部落库，可在个人中心回看
- 个人中心新增「学习记录」面板：收藏数、已读数、掌握度分布、面试场次 + 三个列表页签
- `V16__user_learning_data.sql`：`user_favorite`、`user_question_progress`、`interview_session`、`interview_message`

### 变更
- 面试页开始面试时自动创建场次，每轮对话静默写库；保存失败不打断面试
- 新增接口：`/api/user/favorites`、`/api/user/progress`、`/api/user/learning/summary`、`/api/interview/sessions`

### 验证
- 后端 `compileKotlin` 通过，V16 迁移成功
- 收藏增删查、刷题记录、面试场次创建/追加/结束/详情/列表接口实测通过
- `/api/user/learning/summary` 返回收藏 1、已读 1、模糊 1、面试 1
- 前端 typecheck / lint / build 通过
- `/questions/61` 渲染出收藏按钮，`/profile` 渲染出学习记录面板
- 前后端容器 healthy

## [0.27.0] - 2026-11-13

### 变更
- 面试页改为 Agent 对话式布局：整页铺满视口，输入框固定在底部
- 用 `.site-shell:has(.interview-agent)` 让面试页独占视口并隐藏页脚，无需硬编码高度
- 题目不再做视觉焦点，收进 60px 顶栏单行显示（分类 · 难度 · 查看题目）
- 左侧 300px 设置面板改为可折叠：≤1024px 变抽屉 + 遮罩，顶栏提供开关
- 对话列固定 760px 居中；面试官回复去掉气泡，用户回复保留右侧气泡
- 语音、提示、人声三个工具按钮移入输入框内部，发送键改为圆形图标
- 空状态改为简洁的「准备好就开始吧」+ 开始面试按钮
- 结束状态改为内联卡片，提供导出与再练一次

### 验证
- 前端 typecheck / lint / build 通过
- 实测 1440×900：顶栏 60px、侧栏 300px、对话列 760px、输入区 120px 贴合底部，无横向溢出
- 页脚计算样式为 `display: none`，旧题目横幅已从 DOM 移除
- 前端容器 healthy

## [0.26.0] - 2026-11-13

### 变更
- 面试页视觉层级反转：题目从 300px 侧栏的 14px 小卡片提升为全宽横幅，桌面 34.4px
- 原营销标语「你的下一场面试，从这里开始」降为 18.4px 辅助标题，不再与题目抢焦点
- 页面宽度 1280px → 1400px，侧栏 300px → 320px
- 侧栏移除与横幅重复的题目卡，只保留选题、开始/随机、摄像头与清单
- 三段式编号统一为 01 准备 / 02 当前题目 / 03 对话
- 对话区高度 360px → 405px，气泡与输入框字号 13px → 14px，行高 1.85
- 面试官头部压缩（头像 42 → 36，内边距收紧）

### 验证
- 前端 typecheck / lint / build 通过
- 1440px：题目 34.4px、侧栏 320px、对话区 405px、无横向溢出
- 900px：题目 23.4px、侧栏 260px、单列无溢出
- 640px：题目 21.6px、单列 593px、对话区 320px、无横向溢出
- 旧题目卡 `interview-question-card` 已从 DOM 移除
- 前端容器 healthy

## [0.25.1] - 2026-11-13

### 变更
- 面试官默认音色改为「知小夏」（`zhixiaoxia`），写入 `application.yml`、`NowPassProperties`、`infra/docker-compose.yml` 与 `.env.example`，不依赖本机 `.env`
- 文档补充音色选择说明：控制台默认发音人不生效，由 `ALIYUN_TTS_VOICE` 决定；大模型音色标准接口不支持

### 验证
- 实测 AppKey 可用音色：`xiaoyun`、`aixia`、`aijia`、`sitong`、`zhixiaoxia`、`zhixiaobai` 均返回 200
- `longxiaochun` 等 CosyVoice 音色返回 `41020001`，标准接口不支持
- 不带 `ALIYUN_TTS_VOICE` 的一次性容器启动后，`/tts/status` 仍返回 `voice=zhixiaoxia`，确认项目默认值生效
- 切到 `zhixiaoxia` 后合成返回 200

## [0.25.0] - 2026-11-13

### 新增
- 接入阿里云智能语音交互，AI 面试官可使用真实 AI 人声播报
- 后端自动用 AccessKey 换取临时 Token 并缓存到 Redis，Token 与密钥不下发前端
- 新增 `GET /api/interview/tts/status` 与 `POST /api/interview/tts`，后者返回 `audio/mpeg`
- 长回复按中文标点切段顺序播放，单段不超过 300 字
- 前端「语音播报」按钮显示当前模式：AI 人声 / 浏览器语音 / 正在生成 / 正在播报
- 点「开始面试」时预热音频，规避浏览器自动播放限制
- TTS 未配置或合成失败时自动回退浏览器语音

### 变更
- `NowPassProperties` 增加 `nowpass.tts` 配置段
- `application.yml`、`.env.example`、`infra/docker-compose.yml` 增加阿里云 TTS 环境变量
- 前端 `lib/api.ts` 增加二进制请求，并识别 JSON 错误响应
- 文档 `08-ai-interview.md` 补充 TTS 申请步骤、接口与行为约定

### 修复
- `RestClient.uri(String)` 会二次编码已编码的查询串，导致阿里云返回 `InvalidTimeStamp.Format`；改用 `URI.create` 传入完整地址
- TTS Token 与合成失败时记录状态码和响应体，便于排查凭证、权限和配额问题

### 验证
- 后端 `clean build`、前端 typecheck/lint/build 通过
- 未配置时 `/api/interview/tts/status` 返回 `enabled=false`，页面显示「浏览器语音」
- 假凭证下 TTS 返回 400「语音服务暂时不可用」，日志无密钥或 Token 泄露
- 超过 300 字返回 400，未登录返回 401
- 真实阿里云凭证下合成返回 200 与 `audio/mpeg`，文件头为标准 MP3
- Token 成功写入 Redis 并按 `ExpireTime` 设置 TTL
- 前端按钮在配置生效后显示「AI 人声」
- 前后端容器 healthy

## [0.24.0] - 2026-11-12

### 新增
- AI 面试官默认自动朗读新回复，优先使用中文语音
- 底部增加「语音播报」开关，可关闭自动朗读并立即停止当前播报
- 播报时显示「正在播报面试官…」状态，保留单条回复的手动「朗读」
- 自动播报开关持久化到 localStorage

### 修复
- 语音识别 hook 在渲染期写 ref 的 React Compiler 警告
- 知识点页分组 memo 化与 React Compiler 不兼容的问题

### 验证
- 前端 typecheck、build、lint 通过
- `/interview` 渲染出语音播报开关
- 前端容器 healthy，首页返回 200

## [0.23.0] - 2026-11-12

### 新增
- 新增 41 道原创题，补齐空分类与题量不足分类
- 题库从 90 道增至 131 道，43 个分类全部至少 2 道题
- 首页知识点只展示前 6 个分类，保留“查看全部 N 个”入口
- 更新完整题库目录

### 验证
- `V15__fill_category_questions.sql` 迁移成功
- 题库总数 131，分类数 43
- 每个分类题量最少 2 道，最多 7 道
- 首页渲染 6 个分类，知识点页展示全部
- 后端构建、前端 typecheck/build 通过
- 前后端容器 healthy

## [0.22.1] - 2026-11-12

### 修复
- 新增“安全与合规”大类，把 Web 安全归入，消除前台“未分组”分类

### 验证
- V14 迁移成功
- 分类库 43 个，归属 12 个大类，无未分组分类
- 前台知识点页按大类分组渲染

## [0.22.0] - 2026-11-12

### 变更
- 题库分类改为两层：新增 11 个大类，现有 43 个分类全部归属大类
- 大类包括：编程语言、框架与中间件、数据库与存储、分布式与微服务、系统网络与运维、前端、算法与数据结构、测试与工程质量、架构与场景设计、AI 与大模型、求职与软技能
- 知识点页按大类分组展示，不再平铺全部分类
- 不逐个添加细碎标签，避免大量 0 题分类
- 新增 `V13__question_category_groups.sql`，不修改已执行的 V12

### 验证
- V13 迁移成功
- 分类库总数 43，归属 11 个大类
- 有题分类仍为 23，题库保持 90 道
- 前台知识点页按大类分组渲染
- 后端构建通过，容器 healthy

## [0.21.0] - 2026-11-12

### 新增
- 补充分类维度：Java 集合、后端场景、Go、MyBatis、Netty、C++、Python、C#、PHP、MongoDB、JavaScript、Vue、Git、Nginx、DevOps、AI 应用开发、AI Agent、前端手写代码、前端代码分析、系统运维
- 分类库从 23 个扩展到 43 个
- 前台分类接口只返回已有题目的分类，避免展示 0 题空分类

### 验证
- `V12__category_taxonomy.sql` 迁移成功
- 分类库总数 43，有题分类仍为 23
- 题库总数保持 90，前台分类接口仍返回 23 个有题分类
- 后端构建通过，容器 healthy

## [0.20.0] - 2026-11-12

### 新增
- 新增 6 个知识分类：React、TypeScript、浏览器与前端工程化、性能优化、测试与质量、架构设计
- 新增 30 道原创面试题，题库从 60 道增至 90 道，共 23 个分类
- 新增 `docs/13-question-bank.md`，按分类整理完整题库目录

### 验证
- `V11__expand_question_bank_90.sql` 迁移成功
- 题库总数 90，新增题目 ID 61–90
- 23 个分类均有题目，分类排序正常
- 后端构建通过，容器 healthy

## [0.19.0] - 2026-11-12

### 新增
- 视频评论：分页列表、发表评论、本人或管理员删除
- 视频弹幕：按播放时间点展示，支持滚动、顶部固定、底部固定和自定义颜色
- 播放器下方弹幕输入框，按 Enter 或点击发送
- `V10__video_interactions.sql`：新增 `video_comment` 与 `video_danmaku`
- 评论与弹幕接口限流：8 次/分钟、20 次/分钟

### 验证
- `V10` 迁移成功
- 评论新增、分页查询、删除接口验证通过
- 弹幕新增、列表接口验证通过
- 视频详情页真实登录态渲染出弹幕输入框和评论区
- 后端 `clean build`、前端 `typecheck` / `build` 通过
- 后端、前端容器 healthy

## [0.18.0] - 2026-11-12

### 变更
- 前端容器改用 OpenResty 提供静态资源与 `/api/` 反向代理
- `docker-compose.yml` 迁入 `infra/docker-compose.yml`
- Compose 构建上下文调整为仓库根目录，Dockerfile 与 OpenResty 配置统一从 `infra/` 引用
- 根 `package.json` 新增 `docker:up`、`docker:app`、`docker:down` 脚本
- `.dockerignore` 保留在仓库根目录，因为 Docker 只读取构建上下文根目录的忽略文件

### 验证
- `docker compose -f infra/docker-compose.yml --env-file .env config` 通过
- 前后端镜像按新路径构建成功
- 后端、前端容器 healthy，前端返回 200

## [0.17.0] - 2026-11-12

### 变更
- Gradle Wrapper、`settings.gradle.kts`、`build.gradle.kts` 与后端模块整体迁入 `backend/`
- 后端去掉 `backend/modules` 和 `backend/api` 层级，扁平化为 `backend/nowpass-common`、`nowpass-framework`、`nowpass-system`、`nowpass-admin`
- Gradle 任务统一为 `:nowpass-admin:bootRun`、`:nowpass-admin:bootJar`
- 根目录新增 pnpm workspace，前端包名改为 `@nowpass/web`
- 新增 `packages/api-contracts`，集中存放共享 TypeScript 接口类型
- Dockerfile 与反向代理配置迁入 `infra/`
- 新增 `docs/12-monorepo.md`，更新 README、架构、数据库、开发与 Docker 文档

### 验证
- `cd backend && ./gradlew clean build` 通过
- `pnpm install --frozen-lockfile` 通过
- `pnpm --filter @nowpass/web typecheck` 与 `build` 通过
- 前后端容器 healthy，前端 `http://127.0.0.1:8088` 返回 200
- 题库数据未变化，仍为 60 道

## [0.15.0] - 2026-10-30

### 新增
- V9 迁移新增 10 道原创面试题，题库从 50 道增至 60 道
- 覆盖 Java 基础、JVM、数据库、计算机网络、Kotlin、Spring、并发编程
- 新增 `docs/11-question-curation.md`，记录选题规范与外部题库导入边界

### 说明
- 未直接抓取或复制第三方站点题干和答案
- 题目与答案按公开常见考点重新撰写，避免版权与低质量重复内容

### 验证
- V9 迁移成功，`question` 表 60 条有效记录
- 新增题目 ID 51–60，分类与难度正确
- `/api/questions/51` 与 `/api/questions/51/answer` 返回正常

## [0.14.1] - 2026-10-28

### 优化
- 知识点页卡片放大：2 列布局、88px 行高、40px 图标、14px 标题
- 描述最多两行，卡片改为可悬浮的表面卡片；首页密集索引保持不变

### 验证
- `pnpm build` 通过，前端容器 healthy

## [0.14.0] - 2026-10-28

### 优化
- 题库页头部改为左对齐紧凑布局，缩小标题、筛选区、题目行高度与圆角
- 知识点页改为 2 列行式索引，17 个知识点更紧凑
- 刷题路线压缩头部、阶段卡内边距、图标与标签尺寸
- 视频库压缩标题、统计栏、筛选区与卡片间距
- AI 面试间压缩头部、侧栏、聊天区和输入区
- 个人中心压缩资料卡与表单卡内边距和圆角
- 阅读详情页保留必要留白，不做过度压缩

### 验证
- 前端 TypeScript / `pnpm build` 通过
- 真实 token 渲染检查：题库、知识点（17 行）、路线、视频库、AI 面试、个人中心均正常
- 前端容器 healthy

## [0.13.0] - 2026-10-28

### 优化
- 首页改为紧凑编辑部索引：缩小首屏标题、留白和按钮尺寸
- 移除大面积深色“今日提示”卡片，改为轻量数据侧栏与快捷入口
- 知识点从大卡片网格改为 3 列行式索引，17 个知识点一屏更密集
- 热门题与刷题路线压成窄面板，减少圆角和阴影
- 首页说明、热门列表、区块标题同步收紧字号与间距

### 验证
- 前端 TypeScript / `pnpm build` 通过
- 真实 token 渲染：首页新结构、17 个知识点行、路线面板均正常
- 旧版 `home-hero__note` 深色卡片已不存在
- 前端容器 healthy

## [0.12.0] - 2026-10-28

### 新增
- 登录页支持 QQ 互联 OAuth 登录，未配置时自动隐藏入口
- 新增 `user_oauth` 身份表与 V8 迁移，支持 QQ openid 复用
- 首次 QQ 登录自动创建普通用户并签发 NowPass 登录态
- 新增 state 防重放、2 分钟一次性 ticket 与前端回调页
- 新增 `/api/auth/qq/status|authorize|callback|exchange` 四个接口
- 新增 `docs/10-qq-oauth.md` 配置与安全说明

### 验证
- V8 迁移成功
- 未配置时 `/api/auth/qq/status` 返回 `enabled=false`，登录页不显示 QQ 按钮
- 未配置 authorize 返回 699，不会发起无效跳转
- 前端 TypeScript / 构建通过，容器 healthy

## [0.11.0] - 2026-10-27

### 新增
- 视频播放器改为自定义控制条：播放/暂停、缓冲进度、时间、音量与静音
- 支持 0.5×–2× 倍速，播放进度、倍速、音量、静音状态持久化
- 支持宽屏模式（隐藏侧栏并扩展播放区域）与全屏
- 快捷键：Space/K、←/→、↑/↓、M、F、W、/，并提供快捷键说明面板
- 按住鼠标右键临时 2× 快进，松开恢复原倍速
- 播放器控制条自动隐藏、中心播放按钮、缓冲状态与错误提示
- 控制条改为半透明玻璃质感；音量调节时播放器右上角显示图标、百分比与音量条的 HUD
- 音量控件改为 MD3 药丸滑块与动态轨道；HUD 使用弹簧弹出、图标状态涟漪，调节时滑杆自动展开
- 音量滑杆改为 6px 圆角轨道 + 16px MD3 手柄，悬停/拖动时出现状态层光晕
- 音量 HUD 改为持续更新数值，不再每次调节重挂载闪烁；停止操作约 1.8 秒后自动淡出
- 播放器新增设置按钮：倍速面板、记住播放位置开关、恢复默认音量与倍速
- 修复右键误触倍速：鼠标右键或长按右方向键需持续约 450ms 才进入 2×
- 单点右方向键前进 5 秒；详情页标题移到播放器上方，移除右侧 WATCH NOTE 卡片并改为单列
- 进度条改为自定义拖拽：扩大命中区域、指针捕获、悬停时间预览、双击回到开头
- 更新 `docs/09-video.md`

### 验证
- 前端 TypeScript 与 `pnpm build` 通过
- `/videos/:id` 真实 token 渲染通过：自定义控制条、倍速、宽屏按钮均存在
- 前端容器重建并 healthy

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
