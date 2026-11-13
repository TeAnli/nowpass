import { useEffect, useState } from 'react'
import { App as AntApp, Button, Input, Tag } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { supportApi } from '@/api/ai'
import type { SupportMessage } from '@/api/ai'
import { AppIcon } from '@/components/AppIcon'
import { MarkdownView } from '@/components/MarkdownView'

const GREETING: SupportMessage = {
  role: 'assistant',
  content: '你好，我是站点助手。可以问我：怎么收藏题目、AI 面试怎么用、视频在哪看、怎么找回密码。',
}

const QUICK_ASKS = ['怎么收藏题目？', 'AI 面试怎么开始？', '视频讲解在哪？', '忘记密码怎么办？']

export function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<SupportMessage[]>([GREETING])
  const { message } = AntApp.useApp()

  const ask = useMutation({
    mutationFn: (text: string) => supportApi.chat(text, messages.slice(-8)),
    onSuccess: (result) => {
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }])
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '助手暂时不可用')
      setMessages((current) => current.slice(0, -1))
    },
  })

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || ask.isPending) return
    setMessages((current) => [...current, { role: 'user', content: trimmed }])
    setInput('')
    ask.mutate(trimmed)
  }

  return (
    <>
      <button
        type="button"
        className={open ? 'support-fab is-open' : 'support-fab'}
        aria-label={open ? '关闭站点助手' : '打开站点助手'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <AppIcon icon={open ? 'lucide:x' : 'lucide:message-circle-question'} size={20} />
      </button>

      {open && (
        <section className="support-panel" aria-label="站点助手">
          <header className="support-panel__head">
            <div>
              <p className="eyebrow">SUPPORT</p>
              <h2>站点助手</h2>
            </div>
            <Tag bordered={false} className="tag-plain">AI</Tag>
          </header>

          <div className="support-panel__body">
            {messages.map((item, index) => (
              <div key={index} className={`support-msg is-${item.role}`}>
                {item.role === 'assistant'
                  ? <MarkdownView>{item.content}</MarkdownView>
                  : <p>{item.content}</p>}
              </div>
            ))}
            {ask.isPending && <div className="support-msg is-assistant support-msg--typing"><span /><span /><span /></div>}
          </div>

          <div className="support-panel__quick">
            {QUICK_ASKS.map((text) => (
              <button key={text} type="button" onClick={() => submit(text)} disabled={ask.isPending}>{text}</button>
            ))}
          </div>

          <div className="support-panel__composer">
            <Input.TextArea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPressEnter={(event) => {
                if (!event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(input) }
              }}
              autoSize={{ minRows: 1, maxRows: 4 }}
              maxLength={500}
              placeholder="描述你遇到的问题…"
              aria-label="向站点助手提问"
            />
            <Button
              type="primary"
              shape="circle"
              size="small"
              icon={<AppIcon icon="lucide:arrow-up" size={15} />}
              onClick={() => submit(input)}
              loading={ask.isPending}
              disabled={!input.trim()}
              aria-label="发送"
            />
          </div>
        </section>
      )}
    </>
  )
}
