import { useEffect, useRef, useState } from 'react'

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<{
    isFinal: boolean
    [index: number]: { transcript: string }
  }>
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  const browserWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(onFinalText: (text: string) => void) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const callbackRef = useRef(onFinalText)
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  callbackRef.current = onFinalText

  useEffect(() => {
    const Constructor = getRecognitionConstructor()
    if (!Constructor) return
    setSupported(true)
    const recognition = new Constructor()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (!result) continue
        if (result.isFinal) finalText += result[0]?.transcript ?? ''
        else interimText += result[0]?.transcript ?? ''
      }
      setInterim(interimText)
      if (finalText.trim()) {
        callbackRef.current(finalText.trim())
        setInterim('')
      }
    }
    recognition.onerror = (event) => {
      setListening(false)
      setInterim('')
      setError(
        event.error === 'not-allowed'
          ? '麦克风权限被拒绝，请在浏览器地址栏允许麦克风。'
          : event.error === 'no-speech'
            ? '没有识别到语音，请靠近麦克风再试一次。'
            : `语音识别失败：${event.error}`,
      )
    }
    recognition.onend = () => {
      setListening(false)
      setInterim('')
    }
    recognitionRef.current = recognition
    return () => {
      recognition.abort()
      recognitionRef.current = null
    }
  }, [])

  const start = () => {
    setError(null)
    const recognition = recognitionRef.current
    if (!recognition) {
      setError('当前浏览器不支持语音识别，请使用文字输入。')
      return
    }
    try {
      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
      setError('麦克风启动失败，请检查浏览器权限后重试。')
    }
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const toggle = () => {
    if (listening) stop()
    else start()
  }

  return { supported, listening, interim, error, start, stop, toggle }
}
