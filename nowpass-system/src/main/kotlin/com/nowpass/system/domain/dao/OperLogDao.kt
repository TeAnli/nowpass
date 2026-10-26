package com.nowpass.system.domain.dao

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.model.OperLogItem
import com.nowpass.system.domain.model.OperLogRecord
import com.nowpass.system.domain.query.OperLogPageQuery
import com.nowpass.system.domain.table.SysOperLogTable
import com.nowpass.system.mapper.toOperLogItem
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.like
import org.jetbrains.exposed.v1.jdbc.andWhere
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

/**
 * 操作日志数据访问层。
 */
@Repository
class OperLogDao {

    fun insert(record: OperLogRecord) {
        SysOperLogTable.insert {
            it[SysOperLogTable.title] = record.title
            it[SysOperLogTable.businessType] = record.businessType
            it[SysOperLogTable.method] = record.method
            it[SysOperLogTable.requestMethod] = record.requestMethod
            it[SysOperLogTable.operName] = record.operName
            it[SysOperLogTable.operUrl] = record.operUrl
            it[SysOperLogTable.operIp] = record.operIp
            it[SysOperLogTable.operParam] = record.operParam
            it[SysOperLogTable.jsonResult] = record.jsonResult
            it[SysOperLogTable.status] = record.status
            it[SysOperLogTable.errorMsg] = record.errorMsg
            it[SysOperLogTable.costTime] = record.costTime
            it[SysOperLogTable.operTime] = OffsetDateTime.now()
        }
    }

    fun page(query: OperLogPageQuery): PageResult<OperLogItem> {
        val base = SysOperLogTable.selectAll()
        query.title?.takeIf { it.isNotBlank() }?.let { title ->
            base.andWhere { SysOperLogTable.title like "%$title%" }
        }
        query.operName?.takeIf { it.isNotBlank() }?.let { operName ->
            base.andWhere { SysOperLogTable.operName eq operName }
        }
        query.status?.takeIf { it.isNotBlank() }?.let { status ->
            base.andWhere { SysOperLogTable.status eq status }
        }

        val total = base.copy().count()
        val rows = base.orderBy(SysOperLogTable.id to SortOrder.DESC)
            .limit(query.pageSize)
            .offset(query.offset)
            .map { it.toOperLogItem() }

        return PageResult.of(total, query.page, query.pageSize, rows)
    }
}
