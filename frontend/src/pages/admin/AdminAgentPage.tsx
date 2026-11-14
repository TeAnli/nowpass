import { useRef, useState } from 'react'
import { App as AntApp, Button, Input, Tag, Tooltip } from 'antd'
import { useMutation } from '@tanstack/react-query'
import type { AgentExecuteResult, AgentMessage, AgentPendingAction } from '@/api/agent'
import { agentApi } from '@/api/agent'
import { AppIcon } from '@/components/AppIcon'
import { MarkdownView } from '@/components/MarkdownView'
import { AdminPageHeader } from './AdminPageHeader'

const EXAMPLES = [
  '现在题库和分类各有多少？',
  '列出「数据库」分类下最近的 5 道题',
  '在「数据库」分类新建一道关于索引下推的题',
  '把视频 5 下线',
]

interface Turn {
  role: 'user' | 'assistant'
  content: string
  pending?: AgentPendingAction[]
  results?: AgentExecuteResult[]
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
        .filter((turn) => !turn.pending && !turn.results)
        .map((turn) => ({ role: turn.role, content: turn.content }))
      return agentApi.chat(text, history)
    },
    onSuccess: (result) => {
      setTurns((current) => [
        ...current,
        { role: 'assistant', content: result.reply, pending: result.pendingActions },
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
          turn.pending && turn.pending[0]?.tool === actions[0]?.tool && turn.pending.length === actions.length
            ? { ...turn, pending: undefined }
            : turn,
        ),
        { role: 'assistant', content: '执行结果如下：', results: data.results },
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
        description="用自然语言查询与维护数据。只读查询会直接执行；写操作会先列出待确认动作，你确认后才会落库，并记录审计日志。"
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
                {turn.role === 'assistant' ? <MarkdownView>{turn.content}</MarkdownView> : <p>{turn.content}</p>}

                {turn.pending && turn.pending.length > 0 && (
                  <div className="agent-actions">
                    <p className="agent-actions__title">
                      <AppIcon icon="lucide:shield-alert" size={14} /> 待确认动作（{turn.pending.length}）
                    </p>
                    <ul>
                      {turn.pending.map((action, actionIndex) => (
                        <li key={`${action.tool}-${actionIndex}`}>
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
                        onClick={() => execute.mutate(turn.pending!)}
                      >
                        确认执行
                      </Button>
                      <Button
                        size="small"
                        onClick={() => setTurns((current) => current.map((item, i) => (i === index ? { ...item, pending: undefined } : item)))}
                      >
                        忽略
                      </Button>
                    </div>
                  </div>
                )}

                {turn.results && (
                  <ul className="agent-results">
                    {turn.results.map((result, resultIndex) => (
                      <li key={resultIndex} className={result.success ? 'is-ok' : 'is-fail'}>
                        <AppIcon icon={result.success ? 'lucide:check-circle-2' : 'lucide:x-circle'} size={14} />
                        <span className="mono">{result.tool}</span>
                        <span>{result.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
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
            placeholder="例如：统计每个分类的题量，并把空分类列出来"
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
