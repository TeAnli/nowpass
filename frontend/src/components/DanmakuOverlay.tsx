import { useEffect, useRef, useState } from 'react'
import type { VideoDanmakuItem } from '@nowpass/api-contracts'

interface DanmakuOverlayProps {
  items: VideoDanmakuItem[]
  currentTime: number
  playing: boolean
}

interface ActiveDanmaku {
  id: number
  key: string
  content: string
  color: string
  mode: VideoDanmakuItem['mode']
  lane: number
  born: number
}

const LANES = 7
const LIFETIME_MS = 9000

export function DanmakuOverlay({ items, currentTime, playing }: DanmakuOverlayProps) {
  const [active, setActive] = useState<ActiveDanmaku[]>([])
  const lastTimeRef = useRef(-0.3)
  const seenRef = useRef(new Set<number>())

  useEffect(() => {
    const time = currentTime
    const previous = lastTimeRef.current

    if (time < previous - 1 || time > previous + 2.5) {
      seenRef.current.clear()
      setActive([])
      lastTimeRef.current = Math.max(-0.3, time - 0.35)
    }

    const next = items.filter((item) => {
      const at = item.timeMs / 1000
      return at >= lastTimeRef.current - 0.1 && at <= time + 0.3 && !seenRef.current.has(item.id)
    })

    if (next.length > 0) {
      next.forEach((item) => seenRef.current.add(item.id))
      setActive((current) => [
        ...current,
        ...next.map((item) => ({
          id: item.id,
          key: `${item.id}-${Date.now()}`,
          content: item.content,
          color: item.color,
          mode: item.mode,
          lane: item.id % LANES,
          born: Date.now(),
        })),
      ].slice(-40))
    }

    lastTimeRef.current = time
  }, [currentTime, items])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => current.filter((item) => Date.now() - item.born < LIFETIME_MS))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className={playing ? 'danmaku-layer' : 'danmaku-layer is-paused'} aria-hidden="true">
      {active.map((item) => (
        <span
          key={item.key}
          className={`danmaku-item is-${item.mode}`}
          style={{
            color: item.color,
            top: item.mode === 'scroll' ? `${8 + item.lane * 10}%` : undefined,
          }}
          title={item.content}
        >
          {item.content}
        </span>
      ))}
    </div>
  )
}
