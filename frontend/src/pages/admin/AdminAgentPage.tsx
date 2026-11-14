import { useEffect, useRef, useState } from 'react'
import { App as AntApp, Button, Input, Spin, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation } from '@tanstack/react-query'
import type {
  AgentMessage,
  AgentPendingAction,
  AgentReply,
  AgentStep,
  AgentTable,
} from '@/api/agent'
import { agentApi } from '@/api/agent'
import { AppIcon } from '@/components/AppIcon'
import { ApiError } from '@/lib/api'
import { useAgentChat } from '@/store/agentChat'
import { AdminPageHeader } from './AdminPageHeader'

const EXAMPLES = [
  '现在题库和分类各有多少？',
  '列出「数据库」分类下最近的 5 道题',
  '在「数据库」分类新建一道关于索引下推的题',
  '把视频 5 下线',
]

const TOOL_LABEL: Record<string, string> = {
  stats_overview: '数据概况',
  search_questions: '搜索题目',
  list_categories: '分类列表',
  present_table: '展示表格',
  create_question: '创建题目',
  delete_question: '删除题目',
  create_category: '新建分类',
  publish_video: '发布视频',
  offline_video: '下线视频',
}

const TOOL_ICON: Record<string, string> = {
  stats_overview: 'lucide:bar-chart-3',
  search_questions: 'lucide:search',
  list_categories: 'lucide:folder-tree',
  present_table: 'lucide:table-2',
  create_question: 'lucide:file-plus-2',
  delete_question: 'lucide:trash-2',
  create_category: 'lucide:folder-plus',
  publish_video: 'lucide:upload',
  offline_video: 'lucide:archive',
}

function DataTable({ table }: { table: AgentTable }) {
  const columns: ColumnsType<Record<string, string>> = table.columns.map((label, index) => ({
    title: label,
    dataIndex: String(index),
    key: String(index),
    ellipsis: true,
  }))
  const rows = table.rows.map((cells, rowIndex) => {
    const record: Record<string, string> = { key: String(rowIndex) }
    cells.forEach((cell, cellIndex) => { record[String(cellIndex)] = cell })
    return record
  })

  return (
    <div className="agent-table">
      <div className="agent-table__head">
        <AppIcon icon="lucide:table-2" size={14} />
        <strong>{table.title}</strong>
        <span className="mono">{table.rows.length} 行</span>
      </div>
      <Table size="small" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 'max-content' }} />
    </div>
  )
}

function ThinkingCard({ steps, streaming }: { steps: AgentStep[]; streaming: boolean }) {
  const [open, setOpen] = useState(true)
  if (steps.length === 0 && !streaming) return null

  return (
    <div className={streaming ? 'agent-think is-live' : 'agent-think'}>
      <button
        type="button"
        className="agent-think__head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <AppIcon icon={open ? 'lucide:chevron-down' : 'lucide:chevron-right'} size={14} />
        <span className="agent-think__title">{streaming ? '正在思考…' : '思考过程'}</span>
        {streaming && <span className="agent-think__pulse" aria-hidden="true" />}
        <span className="agent-think__count mono">{steps.length} 步</span>
      </button>

      {open && (
        <ol className="agent-think__list">
          {steps.map((step) => (
            <li key={step.index} className={step.status === 'running' ? 'is-running' : ''}>
              <details>
                <summary>
                  <span className="agent-think__index mono">{String(step.index).padStart(2, '0')}</span>
                  {step.status === 'running'
                    ? <Spin size="small" />
                    : <AppIcon icon={TOOL_ICON[step.tool] ?? 'lucide:wrench'} size={13} />}
                  <span className="agent-think__name">{TOOL_LABEL[step.tool] ?? step.tool}</span>
                  <Tag bordered={false} color={step.write ? 'gold' : 'default'} className="agent-think__tag">
                    {step.write ? '写' : '读'}
                  </Tag>
                  {step.status === 'done' && !step.success && <Tag bordered={false} color="red">失败</Tag>}
                  <span className="agent-think__time mono">
                    {step.status === 'running' ? '执行中' : `${step.durationMs} ms`}
                  </span>
                </summary>
                <div className="agent-think__detail">
                  <div>
                    <span className="agent-think__label">参数</span>
                    <pre>{step.args || '{}'}</pre>
                  </div>
                  {step.status === 'done' && (
                    <div>
                      <span className="agent-think__label">结果</span>
                      <pre>{step.result}</pre>
                    </div>
                  )}
                </div>
              </details>
            </li>
          ))}
          {streaming && (
            <li className="agent-think__waiting">
              <span className="agent-think__dots"><span /><span /><span /></span>
              <span>等待下一步…</span>
            </li>
          )}
        </ol>
      )}
    </div>
  )
}

export function AdminAgentPage() {
  const { message } = AntApp.useApp()
  const [input, setInput] = useState('')
  const turns = useAgentChat((state) => state.turns)
  const busy = useAgentChat((state) => state.busy)
  const appendTurn = useAgentChat((state) => state.appendTurn)
  const patchTurn = useAgentChat((state) => state.patchTurn)
  const setBusy = useAgentChat((state) => state.setBusy)
  const clearChat = useAgentChat((state) => state.clear)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    window.setTimeout(() => {
      const element = scrollRef.current
      if (element) element.scrollTop = element.scrollHeight
    }, 40)
  }

  useEffect(() => {
    scrollToBottom()
  }, [])

  const execute = useMutation({
    mutationFn: (actions: AgentPendingAction[]) => agentApi.execute(actions),
    onSuccess: (data, actions) => {
      const target = turns.find((turn) => turn.pending === actions)
      if (target) patchTurn(target.id, (turn) => ({ ...turn, pending: [] }))
      appendTurn({ role: 'assistant', content: '', steps: [], tables: [], pending: [], results: data.results })
      const failed = data.results.filter((item) => !item.success).length
      if (failed === 0) message.success('已执行完成')
      else message.warning(`${failed} 个动作执行失败`)
      scrollToBottom()
    },
    onError: (error) => message.error(error instanceof Error ? error.message : '执行失败'),
  })

  const submit = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    const history: AgentMessage[] = turns
      .filter((turn) => !turn.results)
      .map((turn) => ({ role: turn.role, content: turn.content }))
      .filter((item) => item.content.trim().length > 0)

    appendTurn({ role: 'user', content: trimmed, steps: [], tables: [], pending: [] })
    const assistantId = appendTurn({ role: 'assistant', content: '', steps: [], tables: [], pending: [], streaming: true })
    setInput('')
    setBusy(true)
    scrollToBottom()

    try {
      await agentApi.stream(trimmed, history, (event, data) => {
        if (event === 'step') {
          const payload = data as AgentStep
          patchTurn(assistantId, (turn) => {
            const exists = turn.steps.some((step) => step.index === payload.index)
            return {
              ...turn,
              currentTool: payload.status === 'running' ? payload.tool : null,
              steps: exists
                ? turn.steps.map((step) => (step.index === payload.index ? payload : step))
                : [...turn.steps, payload],
            }
          })
        } else if (event === 'table') {
          patchTurn(assistantId, (turn) => ({ ...turn, tables: [...turn.tables, data as AgentTable] }))
        } else if (event === 'result') {
          const payload = data as AgentReply
          patchTurn(assistantId, (turn) => ({
            ...turn,
            content: payload.reply,
            tables: payload.tables?.length ? payload.tables : turn.tables,
            pending: payload.pendingActions ?? [],
            streaming: false,
            currentTool: null,
          }))
        } else if (event === 'error') {
          const payload = data as { message?: string }
          patchTurn(assistantId, (turn) => ({
            ...turn,
            streaming: false,
            error: payload.message ?? '智能体暂时不可用',
          }))
        }
        scrollToBottom()
      })
    } catch (error) {
      const text = error instanceof ApiError || error instanceof Error ? error.message : '智能体暂时不可用'
      patchTurn(assistantId, (turn) => ({ ...turn, streaming: false, error: text }))
    } finally {
      setBusy(false)
      patchTurn(assistantId, (turn) => (turn.streaming ? { ...turn, streaming: false } : turn))
      scrollToBottom()
    }
  }

  return (
    <div className="admin-page agent-page">
      <AdminPageHeader
        eyebrow="AI / AGENT"
        title="AI 智能体"
        description="用自然语言查询与维护数据。思考过程会实时展开，最终结论单独成卡；写操作需二次确认后才会落库并记审计。"
      />

      <div className="agent-console">
        <div className="agent-console__log" ref={scrollRef}>
          {turns.length === 0 && (
            <div className="agent-console__empty">
              <span className="agent-console__mark" aria-hidden="true">
                <AppIcon icon="lucide:sparkles" size={22} />
              </span>
              <h2>试试这样问</h2>
              <div className="agent-console__examples">
                {EXAMPLES.map((text) => (
                  <button key={text} type="button" onClick={() => void submit(text)}>{text}</button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn) => (
            <div key={turn.id} className={`agent-turn is-${turn.role}`}>
              <span className="agent-turn__role">{turn.role === 'user' ? '你' : '智能体'}</span>

              {turn.role === 'user' && <div className="agent-turn__body"><p className="agent-turn__text">{turn.content}</p></div>}

              {turn.role === 'assistant' && (
                <>
                  <ThinkingCard steps={turn.steps} streaming={Boolean(turn.streaming)} />

                  {(turn.content || turn.tables.length > 0 || turn.pending.length > 0 || turn.results || turn.error) && (
                    <div className="agent-result">
                      <div className="agent-result__head">
                        <AppIcon icon="lucide:sparkles" size={14} />
                        <strong>结论</strong>
                      </div>

                      {turn.error && <p className="agent-result__error">{turn.error}</p>}
                      {turn.content && <p className="agent-turn__text">{turn.content}</p>}

                      {turn.tables.map((table, index) => <DataTable key={index} table={table} />)}

                      {turn.results && turn.results.length > 0 && (
                        <ul className="agent-results">
                          {turn.results.map((result, index) => (
                            <li key={index} className={result.success ? 'is-ok' : 'is-fail'}>
                              <AppIcon icon={result.success ? 'lucide:check-circle-2' : 'lucide:x-circle'} size={14} />
                              <span className="mono">{TOOL_LABEL[result.tool] ?? result.tool}</span>
                              <span>{result.message}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {turn.pending.length > 0 && (
                        <div className="agent-actions">
                          <p className="agent-actions__title">
                            <AppIcon icon="lucide:shield-alert" size={14} /> 待确认动作（{turn.pending.length}）
                          </p>
                          <ul>
                            {turn.pending.map((action, index) => (
                              <li key={`${action.tool}-${index}`}>
                                <span className="agent-actions__icon">
                                  <AppIcon icon={TOOL_ICON[action.tool] ?? 'lucide:wrench'} size={15} />
                                </span>
                                <div>
                                  <strong>{action.title}</strong>
                                  <span>{action.summary}</span>
                                </div>
                                <Tag bordered={false} className="tag-plain mono">{action.tool}</Tag>
                              </li>
                            ))}
                          </ul>
                          <div className="agent-actions__foot">
                            <Button
                              type="primary"
                              size="small"
                              icon={<AppIcon icon="lucide:check" size={14} />}
                              loading={execute.isPending}
                              onClick={() => execute.mutate(turn.pending)}
                            >
                              确认执行
                            </Button>
                            <Button
                              size="small"
                              onClick={() => patchTurn(turn.id, (item) => ({ ...item, pending: [] }))}
                            >
                              忽略
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="agent-console__composer">
          <Input.TextArea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onPressEnter={(event) => {
              if (!event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(input) }
            }}
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={2000}
            placeholder="例如：列出每个分类的题量，找出题量最少的三个"
            aria-label="给智能体的指令"
          />
          <div className="agent-console__actions">
            <div className="agent-console__left">
              <Tooltip title="写操作会先进入待确认列表">
                <span className="agent-console__hint"><AppIcon icon="lucide:shield-check" size={13} /> 写操作需二次确认</span>
              </Tooltip>
              {turns.length > 0 && (
                <Tooltip title="清空本页对话，切换页面后不再保留">
                  <Button size="small" type="text" className="agent-console__clear" icon={<AppIcon icon="lucide:eraser" size={13} />} onClick={clearChat}>
                    清空对话
                  </Button>
                </Tooltip>
              )}
            </div>
            <Button
              type="primary"
              icon={<AppIcon icon="lucide:arrow-up" size={16} />}
              loading={busy}
              disabled={!input.trim() || busy}
              onClick={() => void submit(input)}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
