import { useCallback, useEffect, useRef, useState } from 'react'
import { interviewApi } from '@/api/interview'
import type { InterviewTtsStatus } from '@/api/interview'

const FALLBACK_MAX_CHARS = 280
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA='

function cleanSpeechText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*`>_~[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 按中文标点切分，尽量不把一句话截断。后端单次上限 300 字。
 */
export function splitForTts(text: string, maxChars = FALLBACK_MAX_CHARS): string[] {
  const clean = cleanSpeechText(text)
  if (!clean) return []
  const limit = Math.max(60, Math.min(maxChars, 300))
  const sentences = clean.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [clean]
  const pieces: string[] = []
  sentences.forEach((sentence) => {
    if (sentence.length <= limit) {
      pieces.push(sentence)
      return
    }
    const fragments = sentence.match(/[^，,、\s]+[，,、\s]?/g) ?? [sentence]
    let current = ''
    fragments.forEach((fragment) => {
      if ((current + fragment).length > limit && current) {
        pieces.push(current)
        current = ''
      }
      if (fragment.length > limit) {
        for (let start = 0; start < fragment.length; start += limit) {
          pieces.push(fragment.slice(start, start + limit))
        }
      } else {
        current += fragment
      }
    })
    if (current) pieces.push(current)
  })

  const chunks: string[] = []
  let current = ''
  pieces.forEach((piece) => {
    if ((current + piece).length > limit && current) {
      chunks.push(current.trim())
      current = ''
    }
    current += piece
  })
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter(Boolean)
}

export function useInterviewVoice() {
  const [status, setStatus] = useState<InterviewTtsStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const runRef = useRef(0)

  useEffect(() => {
    let alive = true
    interviewApi.ttsStatus()
      .then((value) => { if (alive) setStatus(value) })
      .catch(() => { if (alive) setStatus(null) })
    return () => { alive = false }
  }, [])

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    runRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    releaseAudio()
    window.speechSynthesis?.cancel()
    setLoading(false)
    setSpeaking(false)
  }, [releaseAudio])

  const browserSpeak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.95
    const voices = window.speechSynthesis.getVoices()
    const chineseVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('zh'))
    if (chineseVoice) utterance.voice = chineseVoice
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    setUsingFallback(true)
    window.speechSynthesis.speak(utterance)
  }, [])

  const playBlob = useCallback((blob: Blob, runId: number): Promise<void> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio
      const cleanup = () => {
        if (objectUrlRef.current === url) {
          URL.revokeObjectURL(url)
          objectUrlRef.current = null
        }
        if (audioRef.current === audio) audioRef.current = null
      }
      audio.onended = () => {
        if (runId === runRef.current) setSpeaking(false)
        cleanup()
        resolve()
      }
      audio.onerror = () => {
        cleanup()
        reject(new Error('音频播放失败'))
      }
      setSpeaking(true)
      audio.play().catch((error) => {
        cleanup()
        reject(error)
      })
    }), [])

  const speak = useCallback(async (text: string) => {
    const clean = cleanSpeechText(text)
    if (!clean) return
    stop()
    const runId = runRef.current
    const activeStatus = status
    if (!activeStatus?.enabled) {
      browserSpeak(clean)
      return
    }
    const chunks = splitForTts(clean, activeStatus.maxChars)
    setLoading(true)
    setUsingFallback(false)
    try {
      for (const chunk of chunks) {
        if (runId !== runRef.current) return
        const controller = new AbortController()
        abortRef.current = controller
        const blob = await interviewApi.tts(chunk, controller.signal)
        if (runId !== runRef.current) return
        setLoading(false)
        await playBlob(blob, runId)
      }
    } catch {
      if (runId !== runRef.current) return
      setLoading(false)
      browserSpeak(clean)
    } finally {
      if (runId === runRef.current) setLoading(false)
    }
  }, [browserSpeak, playBlob, status, stop])

  const prime = useCallback(() => {
    const audio = new Audio(SILENT_WAV)
    audio.volume = 0
    void audio.play().catch(() => undefined)
  }, [])

  useEffect(() => () => {
    runRef.current += 1
    abortRef.current?.abort()
    releaseAudio()
    window.speechSynthesis?.cancel()
  }, [releaseAudio])

  return { status, loading, speaking, usingFallback, speak, stop, prime }
}
