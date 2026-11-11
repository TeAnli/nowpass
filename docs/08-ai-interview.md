# AI 面试官

用户端 `/interview` 是一个模拟面试房间：选择一道题，AI 面试官先请候选人回答，再根据回答追问。用户可以输入文字，也可以打开浏览器麦克风把语音转成文字后发送。

## 1. 功能边界

- 对话历史只保存在当前页面内存，刷新即清空，不落库。
- 语音识别使用浏览器 Web Speech API（Chrome / Edge 支持最好），音频由浏览器厂商的语音服务处理；NowPass 只接收识别后的文字。
- 语音识别要求安全上下文：`localhost` / `127.0.0.1` 或 HTTPS。普通 HTTP 域名下浏览器会拒绝麦克风。
- 不支持语音识别的浏览器仍可正常使用文字输入。
- AI 回复可以点击「朗读」，使用浏览器 `speechSynthesis` 本地朗读。

## 2. 后端接口

`POST /api/interview/chat`，登录后可用。

```json
{
  "questionId": 1,
  "history": [
    { "role": "user", "content": "volatile 只保证可见性..." }
  ]
}
```

响应：

```json
{
  "reply": "回答得不错，但还缺少...",
  "provider": "openai",
  "questionId": 1
}
```

`provider` 取值：

| 值 | 含义 |
|---|---|
| `openai` | 已配置模型，调用成功 |
| `local` | 未配置密钥，使用本地模拟面试官 |
| `local-fallback` | 模型调用失败，自动降级 |

## 3. 配置真实模型

服务端读取以下环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `INTERVIEW_BASE_URL` | `https://api.openai.com/v1` | OpenAI 兼容 API 根地址 |
| `INTERVIEW_API_KEY` | 空 | 模型密钥；为空时本地降级 |
| `INTERVIEW_MODEL` | `gpt-4o-mini` | 模型名 |

示例（DeepSeek）：

```bash
INTERVIEW_BASE_URL=https://api.deepseek.com
INTERVIEW_API_KEY=sk-...
INTERVIEW_MODEL=deepseek-flash
docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d --build backend
```

示例（通义千问兼容模式）：

```bash
INTERVIEW_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
INTERVIEW_API_KEY=sk-...
INTERVIEW_MODEL=qwen-plus
```

不要把密钥写进 `infra/docker-compose.yml` 或 Git。可以在本机 `.env` 中设置，生产环境使用 Secret。

## 4. 本地开发

后端进程需要设置 `INTERVIEW_API_KEY`、`INTERVIEW_BASE_URL` 和 `INTERVIEW_MODEL` 环境变量；前端执行 `pnpm dev`，不接触模型密钥。宿主机直接运行后端时不会自动加载 Compose 的 `.env`。

后端仍从环境变量读取配置；未配置密钥时接口返回 `local` 模式的固定追问，适合没有模型账号时演示。

## 5. 安全与已知限制

- API Key 只在后端使用，不会下发到浏览器。
- 提示词包含当前题目的标准答案，仅用于评估；系统提示要求不要整段念答案，但模型仍可能泄露部分答案，这是模拟面试的取舍。
- 用户输入可能包含提示注入，生产环境建议加输入过滤、调用频率限制和用量上限。
- 语音识别依赖浏览器厂商服务，离线或受限网络下可能不可用。
- 当前没有会话持久化、数字评分和并发用量统计；结束点评按最近 20 条消息生成。


## 6. 面试房间交互与摄像头

- `GET /api/interview/status` 返回 `configured`、`model`、`provider`，需要登录，不返回密钥。配置状态不代表上游服务可用。
- `POST /api/interview/chat` 增加可选 `action`：`chat`（默认追问）、`hint`（提示）、`review`（结束点评），兼容旧客户端。
- DeepSeek 成功响应的 `provider` 为 `deepseek`；其他兼容服务仍为 `openai`。没有密钥为 `local`，上游失败为 `local-fallback`，页面会明确提示。
- 客户端显示完整本场对话，每次仅发送最近 20 条，每条最多 4000 字。点评也仅基于这部分上下文；本地模式只提供练习建议，不伪造 AI 评分。
- 点「结束并点评」生成 Markdown 回顾并停止计时，可导出当前对话为 Markdown；刷新或离开会清空记录。
- 点「开启摄像头」才调用浏览器 `getUserMedia` 申请视频权限，不同时申请麦克风。视频静音、镜像、仅本地预览，不录制、不上传、不送入模型。
- 拒绝权限、未检测到设备、设备占用都有可重试的提示；授权等待可取消。关闭、切题、结束或离开页面均停止视频轨道，取消后迟到的授权流也会释放。
- 摄像头需要 HTTPS 或 `localhost` / `127.0.0.1`，局域网普通 HTTP 地址不能申请权限。参见 [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)。

本地 Docker 接入 DeepSeek：复制 `.env.example` 为 `.env`（已有 `.env` 时只补齐变量），填写 `INTERVIEW_API_KEY`，然后运行：

```bash
docker compose -f infra/docker-compose.yml --env-file .env --profile app up -d --no-build --force-recreate backend
```

模型默认示例 `deepseek-flash`，接口地址 `https://api.deepseek.com`；按账号支持的模型调整，参见 [DeepSeek 官方 API 文档](https://api-docs.deepseek.com/)。不要把 `.env` 提交到 Git。
