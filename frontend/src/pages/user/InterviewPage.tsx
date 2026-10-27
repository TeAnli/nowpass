import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Input, Select, Tag, Tooltip } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/api/catalog'
import { interviewApi } from '@/api/interview'
import type { InterviewMessage } from '@/api/interview'
import { AppIcon } from '@/components/AppIcon'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { ApiError } from '@/lib/api'
import { formatCount } from '@/lib/format'

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remain = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
}

export function InterviewPage() {
  const [searchParams] = useSearchParams()
  const questionParam = Number(searchParams.get('questionId')) || null
  const [selectedId, setSelectedId] = useState<number | null>(questionParam)
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<InterviewMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const questions = useQuery({
    queryKey: ['interview-questions'],
    queryFn: () => catalogApi.listQuestions({ page: 1, pageSize: 200, sort: 'latest' }),
    staleTime: 5 * 60 * 1000,
  })
  const rows = useMemo(() => questions.data?.rows ?? [], [questions.data])
  const selectedQuestion = rows.find((question) => question.id === selectedId) ?? null
  const questionOptions = useMemo(
    () =>
      rows.map((question) => ({
        value: question.id,
        label: `${question.title} · ${question.categoryName ?? '未分类'}`,
      })),
    [rows],
  )

  const speech = useSpeechRecognition((text) => {
    setInput((current) => (current ? `${current} ${text}` : text))
    inputRef.current?.focus()
  })

  useEffect(() => {
    if (selectedId === null && rows.length > 0) setSelectedId(rows[0].id)
  }, [rows, selectedId])

  useEffect(() => {
    if (!startedAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, sending])

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])

  const requestReply = async (history: InterviewMessage[]) => {
    if (!selectedId) return
    setSending(true)
    setError(null)
    try {
      const result = await interviewApi.chat(selectedId, history)
      setProvider(result.provider)
      setMessages([...history, { role: 'assistant', content: result.reply }])
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'AI 面试官暂时无法回复，请稍后重试。')
    } finally {
      setSending(false)
    }
  }

  const startInterview = () => {
    if (!selectedId) return
    setStarted(true)
    setStartedAt(Date.now())
    setNow(Date.now())
    setMessages([])
    setProvider(null)
    setError(null)
    setInput('')
    void requestReply([])
  }

  const changeQuestion = (id: number) => {
    setSelectedId(id)
    setStarted(false)
    setStartedAt(null)
    setMessages([])
    setProvider(null)
    setError(null)
    setInput('')
  }

  const randomQuestion = () => {
    if (!rows.length) return
    const next = rows[Math.floor(Math.random() * rows.length)]
    if (next) changeQuestion(next.id)
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !selectedId || sending || !started) return
    const next: InterviewMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    void requestReply(next)
  }

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
  }

  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const providerLabel = provider === 'openai' ? '云端 AI' : provider ? '本地模拟' : '待开始'

  return (
    <div className="page-container interview-page">
      <header className="interview-heading">
        <div>
          <p className="eyebrow">AI INTERVIEW ROOM / 模拟面试</p>
          <h1>把答案说出来，<br />让 AI 面试官继续追问。</h1>
          <p className="page-heading__lead">
            选择一道题开始。你可以直接输入，也可以打开麦克风用语音回答；面试官会根据题目上下文追问，而不是直接念答案。
          </p>
        </div>
        <div className="interview-heading__meta">
          <span className="interview-live-dot" aria-hidden="true" />
          <span>{started ? '面试进行中' : '等待开始'}</span>
          <strong className="mono">{formatElapsed(elapsed)}</strong>
        </div>
      </header>

      <div className="interview-layout">
        <aside className="surface-card interview-side" aria-labelledby="interview-setup-title">
          <div className="interview-side__head">
            <p className="eyebrow">SESSION SETUP</p>
            <h2 id="interview-setup-title">本场题目</h2>
          </div>
          <label className="interview-field-label" htmlFor="interview-question">
            选择一道面试题
          </label>
          <Select
            id="interview-question"
            showSearch
            optionFilterProp="label"
            value={selectedId ?? undefined}
            onChange={(value) => changeQuestion(value)}
            options={questionOptions}
            loading={questions.isPending}
            disabled={sending}
            placeholder="选择面试题"
            className="interview-question-select"
          />
          <div className="interview-side__buttons">
            <Button type="primary" onClick={startInterview} disabled={!selectedId || sending}>
              {started ? '重新开始' : '开始面试'}
            </Button>
            <Button icon={<AppIcon icon="lucide:shuffle" size={15} />} onClick={randomQuestion} disabled={!rows.length || sending}>
              随机一题
            </Button>
          </div>

          {selectedQuestion && (
            <div className="interview-question-card">
              <div className="interview-question-card__meta">
                <span>{selectedQuestion.categoryName ?? '未分类'}</span>
                <DifficultyBadge value={selectedQuestion.difficulty} />
              </div>
              <h3>{selectedQuestion.title}</h3>
              <div className="interview-question-card__foot">
                <span><AppIcon icon="lucide:eye" size={13} /> {formatCount(selectedQuestion.viewCount)}</span>
                <Link to={`/questions/${selectedQuestion.id}`} target="_blank" rel="noreferrer">
                  查看题目 <AppIcon icon="lucide:arrow-up-right" size={13} />
                </Link>
              </div>
            </div>
          )}

          <div className="interview-side__tips">
            <p><AppIcon icon="lucide:mic" size={15} /> 语音回答会先转成文字，发送前可以修改。</p>
            <p><AppIcon icon="lucide:shield-check" size={15} /> 对话只在当前页面保存，刷新后清空。</p>
            <p><AppIcon icon="lucide:bot" size={15} /> 未配置模型密钥时使用本地模拟面试官。</p>
          </div>
        </aside>

        <section className="surface-card interview-room" aria-labelledby="interview-room-title">
          <header className="interview-room__head">
            <div className="interview-ai-avatar" aria-hidden="true">
              <AppIcon icon="lucide:bot" size={22} />
            </div>
            <div>
              <h2 id="interview-room-title">NowPass AI 面试官</h2>
              <p>{started ? '正在听你的回答，随时可以追问。' : '选择题目后开始这场面试。'}</p>
            </div>
            <Tag bordered={false} color={provider === 'openai' ? 'green' : provider ? 'gold' : 'default'}>
              {providerLabel}
            </Tag>
            <span className="interview-room__timer mono">{formatElapsed(elapsed)}</span>
          </header>

          <div className="chat-list" role="log" aria-live="polite" aria-label="面试对话">
            {!started && messages.length === 0 && (
              <div className="chat-empty">
                <span className="chat-empty__icon"><AppIcon icon="lucide:message-circle" size={24} /></span>
                <h3>准备好就开始</h3>
                <p>左边选一道题，点击「开始面试」。AI 面试官会先请你用自己的话回答。</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content.slice(0, 8)}`}
                className={message.role === 'user' ? 'chat-message chat-message--user' : 'chat-message chat-message--ai'}
              >
                {message.role === 'assistant' && (
                  <span className="chat-avatar" aria-hidden="true"><AppIcon icon="lucide:bot" size={16} /></span>
                )}
                <div className="chat-bubble">
                  <p>{message.content}</p>
                  {message.role === 'assistant' && (
                    <button type="button" className="chat-speak" onClick={() => speak(message.content)} aria-label="朗读这条回复">
                      <AppIcon icon="lucide:volume-2" size={14} /> 朗读
                    </button>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="chat-message chat-message--ai" aria-label="AI 面试官正在思考">
                <span className="chat-avatar" aria-hidden="true"><AppIcon icon="lucide:bot" size={16} /></span>
                <div className="chat-bubble chat-bubble--typing"><span /><span /><span /></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {error && <Alert className="interview-error" type="error" showIcon message={error} role="alert" />}

          <div className="voice-bar">
            <Tooltip title={speech.supported ? '用麦克风输入回答' : '当前浏览器不支持语音识别，请使用文字输入'}>
              <Button
                className={speech.listening ? 'voice-button is-listening' : 'voice-button'}
                type={speech.listening ? 'primary' : 'default'}
                icon={<AppIcon icon={speech.listening ? 'lucide:mic-off' : 'lucide:mic'} size={17} />}
                onClick={speech.toggle}
                disabled={!speech.supported || !started || sending}
                aria-pressed={speech.listening}
              >
                {speech.listening ? '停止聆听' : '语音输入'}
              </Button>
            </Tooltip>
            {speech.listening && <span className="voice-status"><span className="voice-wave" aria-hidden="true" />正在听… {speech.interim}</span>}
            {!speech.supported && <span className="voice-status">当前浏览器不支持语音识别，请使用文字输入。</span>}
            {speech.error && <span className="voice-status voice-status--error">{speech.error}</span>}
          </div>

          <div className="interview-composer">
            <Input.TextArea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              autoSize={{ minRows: 2, maxRows: 5 }}
              placeholder={started ? '输入你的回答，Enter 发送，Shift + Enter 换行…' : '请先选择题目并开始面试…'}
              disabled={!started || sending}
              aria-label="面试回答输入框"
            />
            <Button
              type="primary"
              className="interview-send"
              icon={<AppIcon icon="lucide:send" size={16} />}
              onClick={sendMessage}
              disabled={!started || !input.trim() || sending}
              loading={sending}
            >
              发送
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
