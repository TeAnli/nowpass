package com.nowpass.framework.agent

import org.springframework.stereotype.Component
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * 智能体运行状态：一次对话对应一个 run，前端轮询读取。
 *
 * 用内存表而不是 Redis：run 生命周期只有几十秒，且不跨实例查询；
 * 超过 TTL 的 run 会在下次读写时顺手清理。
 */
@Component
class AgentRunStore {

    private val runs = ConcurrentHashMap<String, AgentRun>()

    fun create(userId: Long): AgentRun {
        cleanup()
        val run = AgentRun(id = UUID.randomUUID().toString().replace("-", ""), userId = userId)
        runs[run.id] = run
        return run
    }

    fun get(id: String, userId: Long): AgentRun? =
        runs[id]?.takeIf { it.userId == userId }

    private fun cleanup() {
        val deadline = System.currentTimeMillis() - TTL_MS
        runs.entries.removeIf { it.value.startedAt < deadline }
    }

    companion object {
        private const val TTL_MS = 10 * 60 * 1000L
    }
}

class AgentRun(
    val id: String,
    val userId: Long,
) {
    val startedAt: Long = System.currentTimeMillis()

    @Volatile
    var status: String = "running"

    @Volatile
    var reply: String = ""

    @Volatile
    var provider: String = ""

    @Volatile
    var error: String? = null

    val steps: MutableList<AgentStep> = mutableListOf()
    val tables: MutableList<AgentTable> = mutableListOf()
    val pending: MutableList<AgentPendingAction> = mutableListOf()

    /** 当前正在执行的工具名，前端用来显示「正在调用 xxx」。 */
    @Volatile
    var currentTool: String? = null

    @Synchronized
    fun startStep(index: Int, round: Int, tool: String, write: Boolean, args: String) {
        currentTool = tool
        steps += AgentStep(
            index = index,
            round = round,
            tool = tool,
            write = write,
            args = args,
            result = "",
            durationMs = 0,
            success = true,
            status = "running",
        )
    }

    @Synchronized
    fun finishStep(step: AgentStep) {
        currentTool = null
        val position = steps.indexOfFirst { it.index == step.index }
        if (position >= 0) steps[position] = step else steps += step
    }

    @Synchronized
    fun addTable(table: AgentTable) {
        tables += table
    }

    @Synchronized
    fun addPending(action: AgentPendingAction) {
        pending += action
    }

    /** 收尾：用最终结果覆盖过程列表，避免重复项。 */
    @Synchronized
    fun complete(result: AgentReply) {
        steps.clear()
        steps.addAll(result.steps)
        tables.clear()
        tables.addAll(result.tables)
        pending.clear()
        pending.addAll(result.pendingActions)
        reply = result.reply
        provider = result.provider
        currentTool = null
        status = "done"
    }

    @Synchronized
    fun fail(message: String) {
        error = message
        currentTool = null
        status = "error"
    }

    fun snapshot(): AgentRunSnapshot = AgentRunSnapshot(
        id = id,
        status = status,
        reply = reply,
        provider = provider,
        error = error,
        currentTool = currentTool,
        steps = synchronized(this) { steps.toList() },
        tables = synchronized(this) { tables.toList() },
        pendingActions = synchronized(this) { pending.toList() },
    )
}

data class AgentRunSnapshot(
    val id: String,
    val status: String,
    val reply: String,
    val provider: String,
    val error: String?,
    val currentTool: String?,
    val steps: List<AgentStep>,
    val tables: List<AgentTable>,
    val pendingActions: List<AgentPendingAction>,
)
