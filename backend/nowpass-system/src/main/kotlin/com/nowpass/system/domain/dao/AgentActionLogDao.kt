package com.nowpass.system.domain.dao

import com.nowpass.system.domain.table.AgentActionLogTable
import org.jetbrains.exposed.v1.jdbc.insert
import org.springframework.stereotype.Repository
import java.time.OffsetDateTime

@Repository
class AgentActionLogDao {

    /**
     * 记录一次写操作。参数名刻意避开列名，避免 insert 作用域里的列与参数同名冲突。
     */
    fun record(
        actorId: Long,
        toolName: String,
        payload: String,
        resultSummary: String?,
        ok: Boolean,
    ) {
        AgentActionLogTable.insert {
            it[userId] = actorId
            it[tool] = toolName
            it[argsJson] = payload.take(4000)
            it[resultText] = resultSummary?.take(2000)
            it[success] = ok
            it[createTime] = OffsetDateTime.now()
        }
    }
}
