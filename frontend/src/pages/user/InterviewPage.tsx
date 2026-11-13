import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Input, Select, Tag, Tooltip } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/api/catalog'
import { interviewApi } from '@/api/interview'
import type { InterviewAction, InterviewMessage } from '@/api/interview'
import { AppIcon } from '@/components/AppIcon'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { MarkdownView } from '@/components/MarkdownView'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useInterviewVoice } from '@/hooks/useInterviewVoice'
import { ApiError } from '@/lib/api'

function formatElapsed(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function InterviewPage() {
  const [searchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<number | null>(Number(searchParams.get('questionId')) || null)
  const [phase, setPhase] = useState<'ready' | 'active' | 'finished'>('ready')
  const [messages, setMessages] = useState<InterviewMessage[]>([])
  const [reportIndex, setReportIndex] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [provider, setProvider] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failedAction, setFailedAction] = useState<InterviewAction | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [camera, setCamera] = useState<'off' | 'requesting' | 'on'>('off')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try {
      return localStorage.getItem('nowpass.interview.autoSpeak') !== '0'
    } catch {
      return true
    }
  })
  const voice = useInterviewVoice()
  const speakVoice = voice.speak
  const chatRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<TextAreaRef>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraRequestRef = useRef(0)
  const requestRef = useRef<AbortController | null>(null)
  const spokenRef = useRef(0)
  const ttsSupported = Boolean(voice.status?.enabled) || 'speechSynthesis' in window

  const questions = useQuery({
    queryKey: ['interview-questions'],
    queryFn: () => catalogApi.listQuestions({ page: 1, pageSize: 200, sort: 'latest' }),
    staleTime: 5 * 60 * 1000,
  })
  const status = useQuery({ queryKey: ['interview-status'], queryFn: interviewApi.status, staleTime: 30_000 })
  const rows = useMemo(() => questions.data?.rows ?? [], [questions.data])
  const selectedQuestion = rows.find((question) => question.id === selectedId) ?? null
  const linkedQuestion = useQuery({
    queryKey: ['question', selectedId], queryFn: () => catalogApi.getQuestion(selectedId!),
    enabled: selectedId !== null && !selectedQuestion,
  })
  const question = selectedQuestion ?? linkedQuestion.data
  const questionOptions = useMemo(() => {
    const options = rows.map((item) => ({ value: item.id, label: `${item.title} · ${item.categoryName ?? '未分类'}` }))
    if (!selectedQuestion && linkedQuestion.data) options.unshift({ value: linkedQuestion.data.id, label: linkedQuestion.data.title })
    return options
  }, [rows, selectedQuestion, linkedQuestion.data])
  const speech = useSpeechRecognition((text) => {
    setInput((current) => (current ? `${current} ${text}` : text).slice(0, 4000))
    inputRef.current?.focus()
  })

  useEffect(() => {
    if (selectedId === null && rows.length > 0) setSelectedId(rows[0].id)
  }, [rows, selectedId])
  useEffect(() => {
    if (!startedAt || phase !== 'active') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, phase])
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])
  useEffect(() => () => {
    requestRef.current?.abort()
    cameraRequestRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    window.speechSynthesis?.cancel()
  }, [])

  const stopCamera = () => {
    cameraRequestRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCamera('off')
  }
  const startCamera = async () => {
    setCameraError(null)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('摄像头需要 HTTPS 或 localhost / 127.0.0.1，请使用安全地址访问。')
      return
    }
    const requestId = ++cameraRequestRef.current
    setCamera('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      })
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => { stopCamera(); setCameraError('摄像头连接已断开，可以重新开启。') }
      })
      if (videoRef.current) videoRef.current.srcObject = stream
      setCamera('on')
    } catch (cameraFailure) {
      if (requestId !== cameraRequestRef.current) return
      setCamera('off')
      const name = cameraFailure instanceof DOMException ? cameraFailure.name : ''
      setCameraError(name === 'NotAllowedError'
        ? '摄像头权限未获允许。请在浏览器地址栏的网站设置中允许摄像头，然后重试。'
        : name === 'NotFoundError' ? '未检测到摄像头，请连接设备后重试。'
          : name === 'NotReadableError' ? '摄像头被其他程序占用或无法读取，请关闭占用程序后重试。'
            : '摄像头启动失败，请检查设备及浏览器权限后重试。')
    }
  }
  const requestReply = async (history: InterviewMessage[], action: InterviewAction = 'chat') => {
    if (!selectedId || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setSending(true)
    setError(null)
    setFailedAction(null)
    try {
      const result = await interviewApi.chat(selectedId, history, action, controller.signal)
      if (controller.signal.aborted) return
      setProvider(result.provider)
      setMessages([...history, { role: 'assistant', content: result.reply }])
      if (action === 'review') { setReportIndex(history.length); setPhase('finished'); setNow(Date.now()) }
    } catch (requestError) {
      if (controller.signal.aborted) return
      setError(requestError instanceof ApiError ? requestError.message : '面试官暂时无法回复，请重试。')
      setFailedAction(action)
    } finally {
      if (requestRef.current === controller) { requestRef.current = null; setSending(false) }
    }
  }
  const resetInterview = (id: number) => {
    requestRef.current?.abort()
    requestRef.current = null
    speech.stop()
    voice.stop()
    spokenRef.current = 0
    stopCamera()
    setSelectedId(id)
    setPhase('ready')
    setStartedAt(null)
    setMessages([])
    setReportIndex(null)
    setProvider(null)
    setError(null)
    setFailedAction(null)
    setSending(false)
    setInput('')
  }
  const startInterview = () => {
    if (!selectedId || sending) return
    speech.stop()
    voice.stop()
    voice.prime()
    spokenRef.current = 0
    setPhase('active')
    setStartedAt(Date.now())
    setNow(Date.now())
    setMessages([])
    setReportIndex(null)
    setProvider(null)
    setInput('')
    void requestReply([])
  }
  const sendMessage = () => {
    const text = input.trim()
    if (!text || sending || phase !== 'active' || failedAction) return
    speech.stop()
    voice.stop()
    const next: InterviewMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    void requestReply(next)
  }
  const finishInterview = () => {
    speech.stop()
    voice.stop()
    stopCamera()
    void requestReply(messages, 'review')
  }
  const finishWithoutReview = () => {
    speech.stop()
    voice.stop()
    stopCamera()
    setPhase('finished')
    setNow(Date.now())
    setError(null)
    setFailedAction(null)
  }
  const toggleAutoSpeak = () => {
    const next = !autoSpeak
    setAutoSpeak(next)
    try {
      localStorage.setItem('nowpass.interview.autoSpeak', next ? '1' : '0')
    } catch {
      // ignore storage errors
    }
    if (!next) voice.stop()
  }
  useEffect(() => {
    if (!autoSpeak || !ttsSupported || phase !== 'active') return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || spokenRef.current >= messages.length) return
    spokenRef.current = messages.length
    void speakVoice(last.content)
  }, [messages, autoSpeak, phase, ttsSupported, speakVoice])
  const exportInterview = () => {
    const text = `# ${question?.title ?? 'NowPass 面试记录'}\n\n` + messages.map((item) => `## ${item.role === 'user' ? '我的回答' : '面试官'}\n\n${item.content}`).join('\n\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'NowPass-面试记录.md'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const answers = messages.filter((item) => item.role === 'user').length
  const currentProvider = provider ?? status.data?.provider
  const cloud = currentProvider === 'deepseek' || currentProvider === 'openai'
  const providerLabel = currentProvider === 'deepseek' ? 'DeepSeek' : currentProvider === 'openai' ? '云端 AI' : currentProvider === 'local-fallback' ? '模型暂不可用 · 本地练习' : currentProvider === 'local' ? '本地练习' : '检测模型中'
  const active = phase === 'active'
  const canInteract = active && !sending && !failedAction

  return (
    <div className="page-container interview-page">
      <header className="interview-heading">
        <div><p className="eyebrow">NOWPASS / INTERVIEW STUDIO</p><h1>模拟面试间</h1></div>
        <div className="interview-heading__meta"><span className={`interview-live-dot${active ? ' is-active' : ''}`} aria-hidden="true" />
          <span>{active ? '面试中' : phase === 'finished' ? '已完成' : '准备就绪'}</span><strong className="mono">{formatElapsed(elapsed)}</strong></div>
      </header>

      <section className="interview-topic" aria-labelledby="interview-topic-title">
        <div className="interview-topic__label">
          <span className="eyebrow">02 / CURRENT QUESTION</span>
          {question && <span className="interview-topic__meta">
            <span>{question.categoryName ?? '技术面试'}</span>
            <DifficultyBadge value={question.difficulty} />
          </span>}
        </div>
        <h2 id="interview-topic-title">{question ? question.title : '先从左侧选择一道题'}</h2>
        <div className="interview-topic__foot">
          <p>先讲理解，再谈原理，最后用一个例子说服面试官。</p>
          {question && <Link to={`/questions/${question.id}`} target="_blank" rel="noreferrer">查看完整题目 <AppIcon icon="lucide:arrow-up-right" size={13} /></Link>}
        </div>
      </section>

      <div className="interview-layout">
        <aside className="surface-card interview-side" aria-label="面试准备">
          <div className="interview-side__head"><p className="eyebrow">01 / PREPARE</p><h2>面试准备</h2></div>
          <label className="interview-field-label" htmlFor="interview-question">本场练习题目</label>
          <Select id="interview-question" showSearch optionFilterProp="label" value={selectedId ?? undefined}
            onChange={resetInterview} options={questionOptions} loading={questions.isPending} disabled={active || sending}
            placeholder="搜索面试题" className="interview-question-select" />
          {questions.isError && <Alert type="error" message="题目加载失败" action={<Button size="small" onClick={() => void questions.refetch()}>重试</Button>} />}
          {linkedQuestion.isError && !selectedQuestion && <Alert type="error" message="当前题目不可用，请选择其他题目。" />}
          <div className="interview-side__buttons">
            <Button type="primary" icon={<AppIcon icon="lucide:play" size={15} />} onClick={startInterview} disabled={!question || sending || active}>{phase === 'finished' ? '再练一次' : '开始面试'}</Button>
            <Tooltip title="随机选择另一道题"><Button aria-label="随机一题" icon={<AppIcon icon="lucide:shuffle" size={15} />} disabled={!rows.length || active || sending} onClick={() => {
              const candidates = rows.filter((item) => item.id !== selectedId)
              if (candidates.length) resetInterview(candidates[Math.floor(Math.random() * candidates.length)].id)
            }} /></Tooltip>
          </div>
          <div className="interview-camera-section">
            <div className="interview-camera-heading"><h3>我的画面</h3><span>{camera === 'on' ? '仅本地预览' : '可选设备'}</span></div>
            <div className={`interview-camera${camera === 'on' ? ' is-on' : ''}`}>
              <video ref={videoRef} autoPlay playsInline muted aria-label="摄像头本地预览" />
              {camera !== 'on' && <div className="interview-camera__placeholder"><AppIcon icon="lucide:video-off" size={28} />
                <strong>{camera === 'requesting' ? '等待浏览器授权' : '摄像头未开启'}</strong><span>{camera === 'requesting' ? '请在权限提示中选择允许' : '打开画面，练习面对镜头表达'}</span></div>}
              {camera === 'on' && <span className="interview-camera__live"><span /> YOU / 本地预览</span>}
            </div>
            <Button block icon={<AppIcon icon={camera === 'on' ? 'lucide:video-off' : 'lucide:video'} size={16} />} onClick={() => camera === 'off' ? void startCamera() : stopCamera()}>
              {camera === 'on' ? '关闭摄像头' : camera === 'requesting' ? '取消等待' : '开启摄像头'}</Button>
            {cameraError && <p className="interview-device-error" role="alert">{cameraError}</p>}
            <p className="interview-camera-note"><AppIcon icon="lucide:shield-check" size={13} />画面不录制、不上传，关闭或离开即释放设备。</p>
          </div>
          <div className="interview-checklist"><span><AppIcon icon="lucide:check" size={14} /> 文字随时可用</span><span><AppIcon icon="lucide:mic" size={14} /> 语音转文字后可编辑</span></div>
        </aside>
        <section className="surface-card interview-room" aria-labelledby="interview-room-title">
          <header className="interview-room__head"><div className="interview-ai-avatar" aria-hidden="true"><AppIcon icon="lucide:audio-lines" size={20} /></div>
            <div><h2 id="interview-room-title">NowPass 面试官</h2><p>{sending ? '正在整理思路…' : phase === 'finished' ? '本场已结束，回顾建议后再练一次。' : '一次一个问题，沿着你的回答深入。'}</p></div>
            <Tag bordered={false} color={cloud ? 'green' : 'default'}>{providerLabel}</Tag></header>
          <div className="interview-session-bar"><span>03 / {phase === 'finished' ? 'REVIEW' : 'CONVERSATION'}</span><span>已回答 <strong>{answers}</strong> 轮 · {formatElapsed(elapsed)}</span></div>
          {status.isError ? <Alert className="interview-model-notice" type="warning" message="模型状态获取失败" action={<Button size="small" onClick={() => void status.refetch()}>重试</Button>} />
            : currentProvider === 'local-fallback' ? <Alert className="interview-model-notice" type="warning" showIcon message="云端模型暂时不可用，当前回复来自本地练习。稍后发送会重新尝试模型。" />
              : status.data && !status.data.configured && <div className="interview-model-notice"><AppIcon icon="lucide:info" size={15} /> 当前为本地练习；配置 DeepSeek 后可获得针对回答的 AI 追问与点评。</div>}
          <div ref={chatRef} className="chat-list" role="log" aria-live="polite" aria-label="面试对话">
            {phase === 'ready' && <div className="chat-empty"><span className="chat-empty__icon"><AppIcon icon="lucide:audio-lines" size={30} /></span>
              <p className="eyebrow">PRACTICE MAKES CONFIDENCE</p><h3>给思考一个说出口的机会。</h3><p>选择一道题，点击「开始面试」。<br />先讲理解，再谈原理，最后用一个例子说服面试官。</p>
              <div className="interview-empty-steps"><span>01 选择题目</span><span>02 自由回答</span><span>03 回顾提升</span></div></div>}
            {messages.map((message, index) => <div key={index} className={`chat-message chat-message--${message.role === 'user' ? 'user' : 'ai'}`}>
              {message.role === 'assistant' && <span className="chat-avatar" aria-hidden="true"><AppIcon icon="lucide:bot" size={16} /></span>}
              <div className="chat-bubble"><span className="chat-message-label">{message.role === 'user' ? '我的回答' : index === reportIndex ? '面试回顾' : '面试官'}</span>
                {message.role === 'assistant' ? <MarkdownView>{message.content}</MarkdownView> : <p>{message.content}</p>}
                {message.role === 'assistant' && <button type="button" className="chat-speak" onClick={() => void voice.speak(message.content)} aria-label="朗读这条回复"><AppIcon icon="lucide:volume-2" size={14} /> 朗读</button>}</div>
            </div>)}
            {sending && <div className="chat-message chat-message--ai" aria-label="面试官正在思考"><span className="chat-avatar"><AppIcon icon="lucide:bot" size={16} /></span><div className="chat-bubble chat-bubble--typing"><span /><span /><span /></div></div>}
          </div>
          {error && <Alert className="interview-error" type="error" showIcon message={error} role="alert" action={<div className="interview-error-actions"><Button size="small" onClick={() => void requestReply(messages, failedAction ?? 'chat')} disabled={sending}>重试</Button><Button size="small" onClick={finishWithoutReview} disabled={sending}>结束并保留记录</Button></div>} />}
          {phase === 'finished' ? <div className="interview-finished"><div><AppIcon icon="lucide:circle-check" size={18} /><span>每一次表达，都比上一次更进一步。</span></div><Button onClick={exportInterview} icon={<AppIcon icon="lucide:download" size={15} />}>导出面试记录</Button></div>
            : <>
              <div className="voice-bar"><Tooltip title={speech.supported ? '语音识别为文字，发送前可修改' : '当前浏览器不支持语音识别，请使用文字'}><Button className={speech.listening ? 'voice-button is-listening' : 'voice-button'}
                type={speech.listening ? 'primary' : 'default'} icon={<AppIcon icon={speech.listening ? 'lucide:mic-off' : 'lucide:mic'} size={16} />} onClick={() => { voice.stop(); speech.toggle() }} disabled={!speech.supported || !canInteract} aria-pressed={speech.listening}>{speech.listening ? '停止聆听' : '语音输入'}</Button></Tooltip>
                <Button type="text" icon={<AppIcon icon="lucide:lightbulb" size={15} />} disabled={!canInteract} onClick={() => { speech.stop(); void requestReply(messages, 'hint') }}>给我提示</Button>
                <Tooltip title={ttsSupported ? (voice.status?.enabled ? '自动播放阿里云 AI 人声，失败时回退浏览器语音' : '自动使用浏览器语音朗读') : '当前浏览器不支持语音播报'}>
                  <Button
                    type={autoSpeak ? 'primary' : 'default'}
                    className={voice.speaking || voice.loading ? 'interview-voice-toggle is-speaking' : 'interview-voice-toggle'}
                    icon={<AppIcon icon={autoSpeak ? 'lucide:volume-2' : 'lucide:volume-x'} size={15} />}
                    onClick={toggleAutoSpeak}
                    disabled={!ttsSupported}
                    aria-pressed={autoSpeak}
                  >
                    {voice.loading ? '正在生成' : voice.speaking ? '正在播报' : autoSpeak ? (voice.status?.enabled ? 'AI 人声' : '浏览器语音') : '语音已关'}
                  </Button>
                </Tooltip>
                <Button type="text" className="interview-finish-button" disabled={!canInteract} onClick={finishInterview}>结束并点评 <AppIcon icon="lucide:arrow-up-right" size={14} /></Button>
                {speech.listening && <span className="voice-status"><span className="voice-wave" aria-hidden="true" />正在听… {speech.interim}</span>}
                {voice.loading && <span className="voice-status voice-status--speaking"><span className="voice-wave" aria-hidden="true" />正在生成 AI 人声…</span>}
                {voice.speaking && <span className="voice-status voice-status--speaking"><span className="voice-wave" aria-hidden="true" />正在播报面试官…</span>}
                {speech.error && <span className="voice-status voice-status--error" role="alert">{speech.error}</span>}
              </div>
              <div className="interview-composer"><Input.TextArea ref={inputRef} value={input} maxLength={4000} showCount onChange={(event) => setInput(event.target.value)} onPressEnter={(event) => {
                if (!event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) { event.preventDefault(); sendMessage() }
              }} autoSize={{ minRows: 2, maxRows: 5 }} placeholder={active ? '说说你的思路，或用语音输入…' : '准备好后，点击左侧「开始面试」'} disabled={!canInteract} aria-label="面试回答输入框" />
                <Button type="primary" className="interview-send" icon={<AppIcon icon="lucide:arrow-up" size={18} />} onClick={sendMessage} disabled={!canInteract || !input.trim()} loading={sending}>发送</Button></div>
              <p className="interview-composer-note">Enter 发送 · Shift + Enter 换行 <span>对话仅在本页保存，离开前可结束并导出</span></p>
            </>}
        </section>
      </div>
    </div>
  )
}
