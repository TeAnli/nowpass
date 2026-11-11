package com.nowpass.common.exception

/**
 * 业务异常。由全局异常处理器转换为 [com.nowpass.common.response.R]。
 */
class ServiceException(
    val errorCode: ErrorCode = ErrorCode.BUSINESS_ERROR,
    override val message: String = errorCode.message,
    cause: Throwable? = null,
) : RuntimeException(message, cause) {

    constructor(message: String) : this(ErrorCode.BUSINESS_ERROR, message)

    constructor(errorCode: ErrorCode) : this(errorCode, errorCode.message)
}
