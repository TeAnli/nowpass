package com.nowpass.common.exception

/**
 * 业务错误码。
 *
 * 分段约定（前端据此决定是否跳登录页）：
 * - 2xx 成功
 * - 400 ~ 405 通用请求错误
 * - 500 系统内部错误
 * - 601 ~ 699 业务错误（鉴权相关集中在 61x）
 */
enum class ErrorCode(val code: Int, val message: String) {

    SUCCESS(200, "操作成功"),

    BAD_REQUEST(400, "请求参数错误"),
    UNAUTHORIZED(401, "登录状态已过期，请重新登录"),
    FORBIDDEN(403, "没有权限访问该资源"),
    NOT_FOUND(404, "请求的资源不存在"),
    METHOD_NOT_ALLOWED(405, "请求方式不支持"),

    INTERNAL_ERROR(500, "系统内部错误"),

    BUSINESS_ERROR(600, "业务处理失败"),

    CAPTCHA_REQUIRED(611, "请输入验证码"),
    CAPTCHA_ERROR(612, "验证码错误或已失效"),

    LOGIN_FAILED(621, "用户名或密码错误"),
    ACCOUNT_DISABLED(622, "账号已停用，请联系管理员"),
    ACCOUNT_PENDING(623, "账号待管理员审批，请稍后再试"),
    ACCOUNT_LOCKED(624, "账号因多次登录失败已被锁定，请稍后再试"),

    USERNAME_EXISTS(631, "用户名已存在"),
    EMAIL_EXISTS(632, "邮箱已被注册"),

    EMAIL_CODE_REQUIRED(641, "请输入邮箱验证码"),
    EMAIL_CODE_ERROR(642, "邮箱验证码错误或已失效"),
    EMAIL_SEND_FAILED(643, "验证邮件发送失败，请联系管理员"),

    RATE_LIMITED(651, "操作过于频繁，请稍后再试"),

    PASSWORD_MISMATCH(661, "原密码不正确"),

    NOT_IMPLEMENTED(699, "该功能暂未开放"),
}
