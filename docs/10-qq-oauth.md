# QQ 登录（OAuth 2.0）

NowPass 支持 QQ 互联 OAuth 登录。未配置 AppID/AppKey 时，登录页不会显示 QQ 按钮；配置后显示「使用 QQ 登录」。

## 1. 流程

```text
登录页
  -> GET /api/auth/qq/authorize
  -> 后端生成 state 存 Redis（5 分钟）
  -> 浏览器跳转 graph.qq.com/oauth2.0/authorize
  -> QQ 回调 GET /api/auth/qq/callback?code=&state=
  -> 后端校验 state、换 access_token、取 openid/昵称/头像
  -> 查 user_oauth；没有则自动创建 NowPass 用户
  -> 创建 NowPass token，生成一次性 ticket（2 分钟）
  -> 浏览器跳转 /oauth/qq/callback?ticket=...
  -> POST /api/auth/qq/exchange
  -> 前端保存 token，进入首页
```

- `state` 和 `ticket` 都是一次性 Redis 键，使用 `getAndDelete` 原子消费。
- QQ `access_token` 只在后端短暂使用，不下发浏览器。
- 前端只拿到一次性 ticket。

## 2. QQ 互联配置

在 [QQ 互联](https://connect.qq.com/) 创建网站应用，获取 AppID / AppKey，并登记回调地址。

本地默认回调：

```text
http://127.0.0.1:8088/api/auth/qq/callback
```

必须与 `QQ_REDIRECT_URI` 完全一致，包括协议、端口、路径和末尾斜杠。

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `QQ_OAUTH_ENABLED` | `false` | 必须为 `true` |
| `QQ_APP_ID` | 空 | QQ 互联 AppID |
| `QQ_APP_KEY` | 空 | QQ 互联 AppKey |
| `QQ_REDIRECT_URI` | `http://127.0.0.1:8088/api/auth/qq/callback` | 后端回调地址 |
| `QQ_FRONTEND_REDIRECT_URI` | `http://127.0.0.1:8088/oauth/qq/callback` | 前端回调页 |

启动示例：

```bash
QQ_OAUTH_ENABLED=true \
QQ_APP_ID=你的AppID \
QQ_APP_KEY=你的AppKey \
docker compose --profile app up -d --force-recreate backend
```

不要把 AppKey 写进 Git、前端环境变量或日志。

## 3. 自动建号规则

首次 QQ 登录会创建一个普通用户：

- 用户名：`qq_` + openid 的安全片段，冲突时追加数字
- 昵称：QQ 昵称（最多 30 字）
- 邮箱：`qq_{openid}@oauth.nowpass.local`（内部占位，不用于发信）
- 状态：`active`
- 角色：`user`

QQ 身份写入 `user_oauth`，唯一键 `(provider, provider_user_id)`，后续登录直接复用。

## 4. 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/auth/qq/status` | `{ enabled: boolean }`，未配置时 false |
| GET | `/api/auth/qq/authorize` | 返回 QQ 授权 URL |
| GET | `/api/auth/qq/callback` | QQ 回调，302 到前端并携带 ticket 或 error |
| POST | `/api/auth/qq/exchange` | 用 ticket 换 NowPass 登录态 |

这四个接口匿名可访问；`exchange` 依赖一次性 ticket，不做额外登录要求。

## 5. 安全说明

- 图形验证码不适用于 OAuth，登录安全由 QQ 授权 + state 防重放保证。
- state 5 分钟有效且一次性；ticket 2 分钟有效且一次性。
- 自动建号不读取 QQ 密码；QQ 只返回 openid、昵称、头像等公开资料。
- 当前不支持把已有 NowPass 账号与 QQ 绑定，也不支持解绑。
- 生产环境必须使用 HTTPS，并把 `QQ_REDIRECT_URI`、`QQ_FRONTEND_REDIRECT_URI` 改成正式域名。

## 6. 本地验证

未配置时：

```bash
curl http://127.0.0.1:18090/api/auth/qq/status
# {"code":200,...,"data":{"enabled":false}}
```

登录页不会出现 QQ 按钮。配置 AppID/AppKey 后重建后端并刷新页面，按钮才会出现。

完整回调只能在 QQ 互联登记的回调域名下测试；本地需要保证 QQ 后台允许 `127.0.0.1` 回调（部分应用需要备案域名）。
