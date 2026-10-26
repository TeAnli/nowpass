# 接口文档

Base URL：`http://127.0.0.1:18090`
交互式文档：`http://127.0.0.1:18090/swagger-ui.html`
OpenAPI JSON：`/v3/api-docs`
调试集：`http/nowpass.http`

## 1. 通用约定

### 响应结构

```json
{ "code": 200, "msg": "操作成功", "data": { } }
```

- `data` 为 `null` 时字段被省略（全局 `default-property-inclusion: non_null`）
- `code` 为 200 表示成功，其余见第 6 节错误码

### HTTP 状态码与业务码的分工（重要）

| HTTP | 含义 | 前端应做什么 |
|---|---|---|
| 200 | 成功，**或业务错误（6xx）** | 看 `code`：200 正常，否则弹提示 |
| 400 | 参数校验失败 | 展示字段错误 |
| 401 | **token 无效或过期** | 清 token，跳登录页 |
| 403 | 已登录但无权限 | 提示无权限，不跳登录 |
| 404 | 资源不存在 | 提示 |
| 500 | 服务端异常 | 提示稍后重试 |

> 登录失败（密码错）、账号锁定、触发限流都返回 **HTTP 200 + 业务码**。
> 这是刻意的：若这些也返 401，前端拦截器会把"密码输错"误判为"会话过期"并跳登录页。

### 认证

```
Authorization: Bearer <tokenId>
```

token 为登录接口返回的 32 位字符串（Redis 会话键的一部分），有效期 120 分钟；
剩余不足 60 分钟时自动续期，新的过期时间通过响应头 `X-Token-Expire-At`（epoch 毫秒）回传。

### 分页

请求：`?page=1&pageSize=10`（页码从 1 开始，`pageSize` 上限 200）

响应：

```json
{ "total": 9, "page": 1, "pageSize": 10, "rows": [] }
```

## 2. 认证接口（匿名可访问）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/auth/captcha` | 获取图形验证码，返回 `{ uuid, img }`，`img` 为 data URI |
| POST | `/api/auth/email-code` | 发送邮箱验证码，`scene` 取 `register` / `reset`；**需图形验证码**；按 IP 限流 3 次/60 秒 |
| POST | `/api/auth/login` | 登录；**需图形验证码**；按 IP+账号限流 10 次/60 秒 |
| POST | `/api/auth/register` | 注册；需邮箱验证码；注册后 `pending` 待审批；按 IP 限流 5 次/小时 |
| POST | `/api/auth/reset-password` | 找回密码；需邮箱验证码；成功后该账号所有会话失效 |
| POST | `/api/auth/logout` | 登出（删除当前会话） |
| GET | `/api/auth/me` | 当前用户信息（角色、权限点、`canEnterAdmin`） |

**验证码出现在登录与"发送邮箱验证码"两处**。注册与找回密码不再重复要求图形验证码——
邮箱验证码本身已证明"人能收到邮件"，而发码那一步已经验过一次图形验证码。
（同一次注册填两次图形验证码没有安全收益，只有摩擦。）

登录响应示例：

```json
{
  "code": 200, "msg": "操作成功",
  "data": {
    "token": "ef6464d728864837a4dac1ac33b42ce3",
    "expireAt": 1770000000000,
    "user": {
      "id": 1, "username": "admin", "nickname": "超级管理员",
      "email": "admin@nowpass.local",
      "roles": ["superadmin"],
      "permissions": ["question:list", "...", "*:*:*"],
      "canEnterAdmin": true
    }
  }
}
```

## 3. 用户端接口（需登录，无权限点要求）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/questions` | 题目分页列表。筛选：`categoryId`、`difficulty`(easy/medium/hard)、`keyword`(标题模糊)、`tag`。**不含题干与答案** |
| GET | `/api/questions/{id}` | 题目详情：含题干 `contentMd` 与选项 `options`，**不含标准答案** |
| GET | `/api/questions/{id}/answer` | 标准答案：`answerMd` + `answerKey`，独立接口 |
| GET | `/api/categories` | 分类列表，含 `questionCount` |
| PUT | `/api/user/profile` | 修改昵称 |
| PUT | `/api/user/password` | 修改密码；成功后**全部会话失效** |

> v1 不支持用户自行修改邮箱：改邮箱需要再来一次邮箱验证流程，收益低于成本。

## 4. 后台接口（需登录 + 权限点）

### 题目管理

| 方法 | 路径 | 权限点 |
|---|---|---|
| GET | `/api/admin/questions` | `question:list` |
| GET | `/api/admin/questions/{id}` | `question:query` |
| GET | `/api/admin/questions/{id}/answer` | `question:query` |
| POST | `/api/admin/questions` | `question:add` |
| PUT | `/api/admin/questions/{id}` | `question:edit` |
| DELETE | `/api/admin/questions/{id}` | `question:remove` |

题目入参（`QuestionUpsertCommand`）：

```json
{
  "categoryId": 5,
  "difficulty": "easy",
  "title": "Kotlin 中哪个关键字声明只读引用？",
  "contentMd": "Markdown 题干",
  "answerMd": "Markdown 标准答案",
  "options": [{ "key": "A", "text": "val" }],
  "answerKey": "A",
  "tags": ["kotlin"]
}
```

校验规则：
- `contentMd`、`answerMd` 必填（题干与标准答案都不能空）
- **选项与答案键必须成对出现**：只给选项不给答案键 → 400；只给答案键不给选项 → 400
- `answerKey` 的每个字符都必须落在 `options` 的 `key` 集合内

### 分类管理

| 方法 | 路径 | 权限点 |
|---|---|---|
| GET | `/api/admin/categories` | `category:list` |
| POST | `/api/admin/categories` | `category:add` |
| PUT | `/api/admin/categories/{id}` | `category:edit` |
| DELETE | `/api/admin/categories/{id}` | `category:remove` |

删除限制：分类下仍有题目时拒绝删除（返回 400 并提示剩余题目数），不做级联删除。

### 用户管理

| 方法 | 路径 | 权限点 | 说明 |
|---|---|---|---|
| GET | `/api/admin/users` | `system:user:list` | 筛选 `keyword`、`status`（`pending` 即待审批） |
| GET | `/api/admin/users/roles` | `system:user:list` | 可选角色列表 |
| POST | `/api/admin/users` | `system:user:add` | 管理员建号，创建即 `active` |
| PUT | `/api/admin/users/{id}/status` | `system:user:approve` | `active` / `pending` / `disabled`；停用立刻踢下线 |
| PUT | `/api/admin/users/{id}/role` | `system:user:edit` | 改角色会清空该用户会话 |
| PUT | `/api/admin/users/{id}/reset-password` | `system:user:resetPwd` | 重置后清空该用户会话 |
| DELETE | `/api/admin/users/{id}` | `system:user:remove` | 不能删自己、不能删超级管理员 |

### 在线会话与日志

| 方法 | 路径 | 权限点 | 说明 |
|---|---|---|---|
| GET | `/api/admin/online` | `monitor:online:list` | 在线会话列表 |
| DELETE | `/api/admin/online/{tokenId}` | `monitor:online:forceLogout` | 强制下线 |
| GET | `/api/admin/oper-logs` | `monitor:operlog:list` | 操作日志，筛选 `title`、`operName`、`status` |

## 5. 角色与权限点

| 角色 | 权限点 |
|---|---|
| `superadmin` | 全部（含 `system:user:remove`、`monitor:online:forceLogout`、`*:*:*`） |
| `admin` | 题目与分类全权、用户查询/建号/改角色/审批/重置密码、在线会话只读、日志只读 |
| `user` | **无权限点**（用户端接口只要求登录） |

## 6. 错误码

| code | 含义 | HTTP |
|---|---|---|
| 200 | 成功 | 200 |
| 400 | 请求参数错误 | 400 |
| 401 | 登录状态失效 | 401 |
| 403 | 无权限 | 403 |
| 404 | 资源不存在 | 404 |
| 500 | 系统内部错误 | 500 |
| 600 | 业务处理失败（通用） | 200 |
| 611 | 请输入验证码 | 200 |
| 612 | 验证码错误或已失效 | 200 |
| 621 | 用户名或密码错误 | 200 |
| 622 | 账号已停用 | 200 |
| 623 | 账号待管理员审批 | 200 |
| 624 | 账号因多次登录失败被锁定 | 200 |
| 631 | 用户名已存在 | 200 |
| 632 | 邮箱已被注册 | 200 |
| 641 | 请输入邮箱验证码 | 200 |
| 642 | 邮箱验证码错误或已失效 | 200 |
| 643 | 验证邮件发送失败 | 200 |
| 651 | 操作过于频繁（限流） | 200 |
| 661 | 原密码不正确 | 200 |
