package com.nowpass.system.domain.table

import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.OffsetDateTime

/**
 * 操作日志表（只记录管理端写操作，不存业务数据）。
 */
object SysOperLogTable : Table("sys_oper_log") {

    val id = long("id").autoIncrement()
    val title = varchar("title", 50)
    val businessType = varchar("business_type", 20)
    val method = varchar("method", 200).nullable()
    val requestMethod = varchar("request_method", 10).nullable()
    val operName = varchar("oper_name", 64).nullable()
    val operUrl = varchar("oper_url", 255).nullable()
    val operIp = varchar("oper_ip", 64).nullable()
    val operParam = text("oper_param").nullable()
    val jsonResult = text("json_result").nullable()
    val status = varchar("status", 10)
    val errorMsg = text("error_msg").nullable()
    val costTime = long("cost_time").nullable()
    val operTime = timestampWithTimeZone("oper_time").clientDefault { OffsetDateTime.now() }

    override val primaryKey = PrimaryKey(id)
}
