import { useRef, useState } from 'react'
import { App as AntApp, Button, Input, Table, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation } from '@tanstack/react-query'
import type {
  AgentExecuteResult,
  AgentMessage,
  AgentPendingAction,
  AgentStep,
  AgentTable,
} from '@/api/agent'
import { agentApi } from '@/api/agent'
import { AppIcon } from '@/components/AppIcon'
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

interface Turn {
  role: 'user' | 'assistant'
  content: string
  steps?: AgentStep[]
  tables?: AgentTable[]
  pending?: AgentPendingAction[]
  results?: AgentExecuteResult[]
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
      <Table
        size="small"
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </div>
  )
}

function ThinkingChain({ steps }: { steps: AgentStep[] }) {
  const [open, setOpen] = useState(false)
  if (steps.length === 0) return null

  return (
    <div className={open ? 'agent-chain is-open' : 'agent-chain'}>
      <button
        type="button"
        className="agent-chain__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <AppIcon icon={open ? 'lucide:chevron-down' : 'lucide:chevron-right'} size={14} />
        <span>思考链 · {steps.length} 步</span>
        <span className="agent-chain__tools mono">
          {steps.map((step) => step.tool).join(' → ')}
        </span>
      </button>

      {open && (
        <ol className="agent-chain__list">
          {steps.map((step) => (
            <li key={step.index}>
              <details>
                <summary>
                  <span className="agent-chain__index mono">{String(step.index).padStart(2, '0')}</span>
                  <AppIcon icon={TOOL_ICON[step.tool] ?? 'lucide:wrench'} size={13} />
                  <span className="agent-chain__name">{TOOL_LABEL[step.tool] ?? step.tool}</span>
                  <Tag bordered={false} color={step.write ? 'gold' : 'default'} className="agent-chain__tag">
                    {step.write ? '写' : '读'}
                  </Tag>
                  {!step.success && <Tag bordered={false} color="red">失败</Tag>}
                  <span className="agent-chain__time mono">{step.durationMs} ms</span>
                </summary>
                <div className="agent-chain__detail">
                  <div>
                    <span className="agent-chain__label">参数</span>
                    <pre>{step.args || '{}'}</pre>
                  </div>
                  <div>
                    <span className="agent-chain__label">结果</span>
                    <pre>{step.result}</pre>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function PendingActions({
  actions,
  busy,
  onExecute,
  onIgnore,
}: {
  actions: AgentPendingAction[]
  busy: boolean
  onExecute: () => void
  onIgnore: () => void
}) {
  return (
    <div className="agent-actions">
      <p className="agent-actions__title">
        <AppIcon icon="lucide:shield-alert" size={14} /> 待确认动作（{actions.length}）
      </p>
      <ul>
        {actions.map((action, index) => (
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
          loading={busy}
          onClick={onExecute}
        >
          确认执行
        </Button>
        <Button size="small" onClick={onIgnore}>忽略</Button>
      </div>
    </div>
  )
}

export function AdminAgentPage() {
  const { message } = AntApp.useApp()
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    window.setTimeout(() => {
      const element = scrollRef.current
      if (element) element.scrollTop = element.scrollHeight
    }, 40)
  }

  const chat = useMutation({
    mutationFn: (text: string) => {
      const history: AgentMessage[] = turns
        .filter((turn) => turn.role === 'user' || (turn.role === 'assistant' && !turn.pending && !turn.results))
        .map((turn) => ({ role: turn.role, content: turn.content }))
      return agentApi.chat(text, history)
    },
    onSuccess: (result) => {
      setTurns((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.reply,
          steps: result.steps,
          tables: result.tables,
          pending: result.pendingActions,
        },
      ])
      scrollToBottom()
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '智能体暂时不可用')
      setTurns((current) => current.slice(0, -1))
    },
  })

  const execute = useMutation({
    mutationFn: (actions: AgentPendingAction[]) => agentApi.execute(actions),
    onSuccess: (data, actions) => {
      setTurns((current) => [
        ...current.map((turn) =>
          turn.pending && turn.pending === actions ? { ...turn, pending: undefined } : turn,
        ),
        { role: 'assistant', content: '执行结果', results: data.results },
      ])
      const failed = data.results.filter((item) => !item.success).length
      if (failed === 0) message.success('已执行完成')
      else message.warning(`${failed} 个动作执行失败，请查看结果`)
      scrollToBottom()
    },
    onError: (error) => message.error(error instanceof Error ? error.message : '执行失败'),
  })

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || chat.isPending) return
    setTurns((current) => [...current, { role: 'user', content: trimmed }])
    setInput('')
    chat.mutate(trimmed)
    scrollToBottom()
  }

  return (
    <div className="admin-page agent-page">
      <AdminPageHeader
        eyebrow="AI / AGENT"
        title="AI 智能体"
        description="用自然语言查询与维护数据。只读查询直接执行并展示结构化表格；写操作先列出待确认动作，确认后才落库并记审计。展开「思考链」可查看每一步工具调用。"
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
                  <button key={text} type="button" onClick={() => submit(text)}>{text}</button>
                ))}
              </div>
            </div>
          )}

          {turns.map((turn, index) => (
            <div key={index} className={`agent-turn is-${turn.role}`}>
              <span className="agent-turn__role">{turn.role === 'user' ? '你' : '智能体'}</span>
              <div className="agent-turn__body">
                <p className="agent-turn__text">{turn.content}</p>

                {turn.tables?.map((table, tableIndex) => (
                  <DataTable key={tableIndex} table={table} />
                ))}

                {turn.results && turn.results.length > 0 && (
                  <ul className="agent-results">
                    {turn.results.map((result, resultIndex) => (
                      <li key={resultIndex} className={result.success ? 'is-ok' : 'is-fail'}>
                        <AppIcon icon={result.success ? 'lucide:check-circle-2' : 'lucide:x-circle'} size={14} />
                        <span className="mono">{TOOL_LABEL[result.tool] ?? result.tool}</span>
                        <span>{result.message}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {turn.pending && turn.pending.length > 0 && (
                  <PendingActions
                    actions={turn.pending}
                    busy={execute.isPending}
                    onExecute={() => execute.mutate(turn.pending!)}
                    onIgnore={() => setTurns((current) =>
                      current.map((item, i) => (i === index ? { ...item, pending: undefined } : item)),
                    )}
                  />
                )}

                {turn.steps && turn.steps.length > 0 && <ThinkingChain steps={turn.steps} />}
              </div>
            </div>
          ))}

          {chat.isPending && (
            <div className="agent-turn is-assistant">
              <span className="agent-turn__role">智能体</span>
              <div className="agent-turn__body agent-turn__body--typing"><span /><span /><span /></div>
            </div>
          )}
        </div>

        <div className="agent-console__composer">
          <Input.TextArea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onPressEnter={(event) => {
              if (!event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(input) }
            }}
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={2000}
            placeholder="例如：列出每个分类的题量，找出题量最少的三个"
            aria-label="给智能体的指令"
          />
          <div className="agent-console__actions">
            <Tooltip title="写操作会先进入待确认列表">
              <span className="agent-console__hint"><AppIcon icon="lucide:shield-check" size={13} /> 写操作需二次确认</span>
            </Tooltip>
            <Button
              type="primary"
              icon={<AppIcon icon="lucide:arrow-up" size={16} />}
              loading={chat.isPending}
              disabled={!input.trim()}
              onClick={() => submit(input)}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
