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

## 2. 前置条件（真实登录必须满足）

QQ 互联对网站应用有硬性要求：

- 网站和回调地址必须使用**已备案的公网域名**
- 回调地址不能使用 `localhost`、`127.0.0.1`，也不能带自定义端口
- 必须使用 HTTPS，回调路径与 QQ 后台登记值完全一致
- 需要注册 QQ 互联开发者账号，创建网站应用并提交审核（通常 1–3 个工作日）
- 上线审核要求登录/注册页有 QQ 登录入口，并使用 QQ 官方登录按钮素材

因此仓库里的 `127.0.0.1` 默认值只用于未配置时占位。真实 QQ 登录请使用类似：

```text
https://nowpass.example.com/api/auth/qq/callback
```

> 没有已备案域名时，QQ 登录无法通过正式审核，也无法用 localhost 完成真实回调。

## 3. 在 QQ 互联创建应用

1. 打开 [QQ 互联应用管理](https://connect.qq.com/manage.html#/)，注册/登录开发者账号。
2. 选择「网站应用」→「创建应用」。
3. 填写网站名称、网站地址、网站分类、简介、回调地址等资料。
4. 回调地址填写正式地址：

```text
https://nowpass.example.com/api/auth/qq/callback
```

5. 创建应用后，在应用详情页获取：
   - `AppID`
   - `AppKey`
6. 用这对凭据配置项目并把 QQ 登录跑通，然后提交上线审核；审核通过后应用状态变为「已上线」。
7. 在「应用接口」中确认「QQ 登录」/获取用户信息权限已开通。

注意：

- 回调地址必须与 `QQ_REDIRECT_URI` 完全一致，包括 `https://`、域名和 `/api/auth/qq/callback`。
- 多个回调地址用英文分号 `;` 分隔。
- 回调地址最长 1024 字符，不能带 `#`。
- 修改回调地址后通常有约 30 分钟缓存，不要改完立刻判定失败。

## 4. 域名与反向代理

QQ 浏览器会访问：

```text
https://nowpass.example.com/api/auth/qq/callback
```

Nginx 需要把 `/api/` 转发到后端（项目自带 `frontend/deploy/nginx.conf` 已处理）：

```nginx
location /api/ {
    proxy_pass http://backend:18090;
}
```

确保：

- 443 端口可从公网访问
- 证书有效
- `/api/auth/qq/status` 能在公网打开
- 不要只把回调配到 `18090` 端口，QQ 不接受带端口的回调地址

## 5. 环境变量

| 变量 | 生产示例 | 说明 |
|---|---|---|
| `QQ_OAUTH_ENABLED` | `true` | 必须为 `true` |
| `QQ_APP_ID` | QQ 后台 AppID | 不要提交到 Git |
| `QQ_APP_KEY` | QQ 后台 AppKey | 不要提交到 Git |
| `QQ_REDIRECT_URI` | `https://nowpass.example.com/api/auth/qq/callback` | 与 QQ 后台完全一致 |
| `QQ_FRONTEND_REDIRECT_URI` | `https://nowpass.example.com/oauth/qq/callback` | 前端回调页 |

在项目根目录 `.env` 中配置（`.env` 应加入 `.gitignore`）：

```dotenv
QQ_OAUTH_ENABLED=true
QQ_APP_ID=你的AppID
QQ_APP_KEY=你的AppKey
QQ_REDIRECT_URI=https://nowpass.example.com/api/auth/qq/callback
QQ_FRONTEND_REDIRECT_URI=https://nowpass.example.com/oauth/qq/callback
```

然后重建后端：

```bash
docker compose --profile app up -d --force-recreate backend
```

前端不需要重新构建，登录页会通过 `/api/auth/qq/status` 自动显示 QQ 按钮。

## 6. 验证步骤

1. 检查状态接口：

```bash
curl https://nowpass.example.com/api/auth/qq/status
# {"data":{"enabled":true}}
```

2. 打开登录页，应出现「使用 QQ 登录」。
3. 点击后跳转 QQ 授权页，登录并同意授权。
4. 回调后应跳转 `/oauth/qq/callback`，随后进入首页。
5. 检查身份表：

```bash
docker exec nowpass-postgres psql -U nowpass -d nowpass \
  -c "select user_id, provider, provider_user_id, last_login_at from user_oauth;"
```

首次登录会自动创建 `qq_...` 用户。

## 7. 常见错误

| 现象 | 原因 |
|---|---|
| `100010` | 回调地址与 QQ 后台不一致，或使用了 localhost/端口 |
| `redirect_uri` 错误 | URL 未编码、协议/路径不一致、缓存未刷新 |
| 登录页没有 QQ 按钮 | `QQ_OAUTH_ENABLED` 非 true，或 AppID/AppKey 为空 |
| `state 已失效` | 授权页停留超过 5 分钟，或重复使用回调链接 |
| `登录票据已失效` | 前端回调超过 2 分钟才 exchange，或 ticket 被重复消费 |
| 审核驳回 | 网站未完成、缺少 QQ 登录入口、按钮未使用官方素材、域名未备案 |

## 8. 自动建号规则

首次 QQ 登录会创建一个普通用户：

- 用户名：`qq_` + openid 的安全片段，冲突时追加数字
- 昵称：QQ 昵称（最多 30 字）
- 邮箱：`qq_{openid}@oauth.nowpass.local`（内部占位，不用于发信）
- 状态：`active`
- 角色：`user`

QQ 身份写入 `user_oauth`，唯一键 `(provider, provider_user_id)`，后续登录直接复用。

## 9. 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/auth/qq/status` | `{ enabled: boolean }`，未配置时 false |
| GET | `/api/auth/qq/authorize` | 返回 QQ 授权 URL |
| GET | `/api/auth/qq/callback` | QQ 回调，302 到前端并携带 ticket 或 error |
| POST | `/api/auth/qq/exchange` | 用 ticket 换 NowPass 登录态 |

这四个接口匿名可访问；`exchange` 依赖一次性 ticket，不做额外登录要求。

## 10. 安全说明

- 图形验证码不适用于 OAuth，登录安全由 QQ 授权 + state 防重放保证。
- state 5 分钟有效且一次性；ticket 2 分钟有效且一次性。
- 自动建号不读取 QQ 密码；QQ 只返回 openid、昵称、头像等公开资料。
- 当前不支持把已有 NowPass 账号与 QQ 绑定，也不支持解绑。
- 生产环境必须使用 HTTPS，并把 `QQ_REDIRECT_URI`、`QQ_FRONTEND_REDIRECT_URI` 改成正式域名。

## 11. 本地验证

未配置时：

```bash
curl http://127.0.0.1:18090/api/auth/qq/status
# {"code":200,...,"data":{"enabled":false}}
```

登录页不会出现 QQ 按钮。配置 AppID/AppKey 后重建后端并刷新页面，按钮才会出现。

完整回调只能在 QQ 互联登记的公网备案域名下测试。`localhost` / `127.0.0.1` 和带端口的地址会被 QQ 拒绝，无法完成真实 QQ 授权。
