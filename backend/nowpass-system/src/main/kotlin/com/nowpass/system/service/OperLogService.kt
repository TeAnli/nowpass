package com.nowpass.system.service

import com.nowpass.common.response.PageResult
import com.nowpass.system.domain.dao.OperLogDao
import com.nowpass.system.domain.model.OperLogItem
import com.nowpass.system.domain.model.OperLogRecord
import com.nowpass.system.domain.query.OperLogPageQuery
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

/**
 * 操作日志服务。
 */
@Service
class OperLogService(
    private val operLogDao: OperLogDao,
) {

    /**
     * 记录日志必须独立事务：业务方法抛异常回滚时，失败日志仍然要留下来。
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun record(record: OperLogRecord) {
        operLogDao.insert(record)
    }

    @Transactional(readOnly = true)
    fun page(query: OperLogPageQuery): PageResult<OperLogItem> = operLogDao.page(query)
}
