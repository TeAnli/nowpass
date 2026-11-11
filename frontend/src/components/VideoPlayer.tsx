import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import type { VideoDanmakuItem } from '@nowpass/api-contracts'
import { AppIcon } from '@/components/AppIcon'
import { DanmakuOverlay } from '@/components/DanmakuOverlay'
import { formatVideoDuration } from '@/lib/format'

interface VideoPlayerProps {
  src: string
  poster?: string
  title: string
  progressKey: string
  wide: boolean
  onToggleWide: () => void
  danmaku?: VideoDanmakuItem[]
  onTimeUpdate?: (seconds: number) => void
}

const RATE_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function VideoPlayer({ src, poster, title, progressKey, wide, onToggleWide, danmaku = [], onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const progressInputRef = useRef<HTMLInputElement | null>(null)
  const lastSavedRef = useRef(0)
  const boostRef = useRef(false)
  const boostTimerRef = useRef<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [boost, setBoost] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [rememberProgress, setRememberProgress] = useState(() => {
    try {
      return localStorage.getItem('nowpass.video.rememberProgress') !== '0'
    } catch {
      return true
    }
  })
  const [error, setError] = useState<string | null>(null)
  const [seeking, setSeeking] = useState(false)
  const [seekPreview, setSeekPreview] = useState<{ percent: number; time: number } | null>(null)
  const [volumeHud, setVolumeHud] = useState({ visible: false, value: 1, muted: false })
  const volumeHudTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (volumeHudTimerRef.current) window.clearTimeout(volumeHudTimerRef.current)
      if (boostTimerRef.current) window.clearTimeout(boostTimerRef.current)
    }
  }, [])

  const showVolumeHud = (value: number, isMuted: boolean) => {
    setVolumeHud({ visible: true, value, muted: isMuted })
    if (volumeHudTimerRef.current) window.clearTimeout(volumeHudTimerRef.current)
    volumeHudTimerRef.current = window.setTimeout(() => {
      setVolumeHud((current) => ({ ...current, visible: false }))
    }, 1800)
  }

  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    const savedRate = Number(localStorage.getItem('nowpass.video.rate') || '1')
    if (RATE_OPTIONS.includes(savedRate)) {
      setRate(savedRate)
      element.playbackRate = savedRate
    }
    const savedVolume = Number(localStorage.getItem('nowpass.video.volume') || '0.9')
    const nextVolume = Number.isFinite(savedVolume) ? clamp(savedVolume, 0, 1) : 0.9
    setVolume(nextVolume)
    element.volume = nextVolume
    const savedMuted = localStorage.getItem('nowpass.video.muted') === '1'
    setMuted(savedMuted)
    element.muted = savedMuted
  }, [src])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === shellRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const stopBoost = () => {
      if (!boostRef.current) return
      boostRef.current = false
      setBoost(false)
      if (videoRef.current) videoRef.current.playbackRate = rate
    }
    window.addEventListener('mouseup', stopBoost)
    return () => window.removeEventListener('mouseup', stopBoost)
  }, [rate])

  const seek = (seconds: number) => {
    const element = videoRef.current
    if (!element) return
    const next = clamp(seconds, 0, duration || element.duration || 0)
    element.currentTime = next
    setCurrent(next)
  }

  const seekToPointer = (clientX: number) => {
    const track = progressRef.current
    if (!track || !duration) return
    const rect = track.getBoundingClientRect()
    const percent = clamp((clientX - rect.left) / rect.width, 0, 1)
    const time = percent * duration
    setSeekPreview({ percent: percent * 100, time })
    seek(time)
  }

  const togglePlay = async () => {
    const element = videoRef.current
    if (!element) return
    setError(null)
    if (element.paused) {
      try {
        await element.play()
      } catch {
        setError('播放失败，请刷新页面或检查视频地址。')
      }
    } else {
      element.pause()
    }
  }

  const changeVolume = (delta: number) => {
    const element = videoRef.current
    if (!element) return
    const next = clamp(element.volume + delta, 0, 1)
    element.volume = next
    element.muted = next === 0
    setVolume(next)
    setMuted(element.muted)
    localStorage.setItem('nowpass.video.volume', String(next))
    showVolumeHud(next, element.muted)
  }

  const toggleMute = () => {
    const element = videoRef.current
    if (!element) return
    const next = !element.muted
    element.muted = next
    setMuted(next)
    localStorage.setItem('nowpass.video.muted', next ? '1' : '0')
    showVolumeHud(next ? 0 : element.volume, next)
  }

  const changeRate = (value: number) => {
    setRate(value)
    if (videoRef.current) videoRef.current.playbackRate = boostRef.current ? Math.max(2, value) : value
    localStorage.setItem('nowpass.video.rate', String(value))
  }

  const toggleFullscreen = async () => {
    if (!shellRef.current) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await shellRef.current.requestFullscreen()
    } catch {
      setError('当前浏览器不允许进入全屏。')
    }
  }

  const beginBoost = () => {
    if (boostRef.current) return
    boostRef.current = true
    setBoost(true)
    if (videoRef.current) videoRef.current.playbackRate = Math.max(2, rate)
  }

  const endBoost = () => {
    if (boostTimerRef.current) {
      window.clearTimeout(boostTimerRef.current)
      boostTimerRef.current = null
    }
    if (!boostRef.current) return
    boostRef.current = false
    setBoost(false)
    if (videoRef.current) videoRef.current.playbackRate = rate
  }

  /**
   * 右键/右方向键必须按住 450ms 才进入 2×，避免误触后一次点击就倍速。
   */
  const scheduleBoost = () => {
    if (boostRef.current || boostTimerRef.current) return
    boostTimerRef.current = window.setTimeout(() => {
      boostTimerRef.current = null
      beginBoost()
    }, 450)
  }

  const startBoost = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 2) return
    event.preventDefault()
    scheduleBoost()
  }

  const stopBoost = () => {
    endBoost()
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return
      switch (event.code) {
        case 'Space':
        case 'KeyK':
          event.preventDefault()
          void togglePlay()
          break
        case 'ArrowLeft':
          event.preventDefault()
          seek(current - 5)
          break
        case 'ArrowRight':
          event.preventDefault()
          if (!event.repeat) {
            seek(current + 5)
            scheduleBoost()
          }
          break
        case 'ArrowUp':
          event.preventDefault()
          changeVolume(0.1)
          break
        case 'ArrowDown':
          event.preventDefault()
          changeVolume(-0.1)
          break
        case 'KeyM':
          event.preventDefault()
          toggleMute()
          break
        case 'KeyF':
          event.preventDefault()
          void toggleFullscreen()
          break
        case 'KeyW':
          event.preventDefault()
          onToggleWide()
          break
        case 'Slash':
          event.preventDefault()
          setShowShortcuts((visible) => !visible)
          break
        case 'Escape':
          setShowShortcuts(false)
          setShowSettings(false)
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'ArrowRight') endBoost()
    }
    const onBlur = () => endBoost()
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  })

  const handleLoadedMetadata = () => {
    const element = videoRef.current
    if (!element) return
    setDuration(element.duration || 0)
    if (!rememberProgress) return
    const saved = Number(localStorage.getItem(progressKey) || '0')
    if (Number.isFinite(saved) && saved > 3 && saved < element.duration - 3) {
      element.currentTime = saved
      setCurrent(saved)
    }
  }

  const handleTimeUpdate = () => {
    const element = videoRef.current
    if (!element) return
    setCurrent(element.currentTime)
    onTimeUpdate?.(element.currentTime)
    if (!rememberProgress) return
    const second = Math.floor(element.currentTime)
    if (Math.abs(second - lastSavedRef.current) < 2) return
    lastSavedRef.current = second
    try {
      localStorage.setItem(progressKey, String(second))
    } catch {
      // ignore storage errors
    }
  }

  const handleProgress = () => {
    const element = videoRef.current
    if (!element || !element.buffered.length) return
    setBuffered(element.buffered.end(element.buffered.length - 1))
  }

  const handleEnded = () => {
    setPlaying(false)
    localStorage.removeItem(progressKey)
  }

  const handleError = () => {
    setError('播放地址可能已过期或视频文件不可用，请刷新页面重试。')
    setPlaying(false)
  }

  const toggleRemember = () => {
    const next = !rememberProgress
    setRememberProgress(next)
    try {
      localStorage.setItem('nowpass.video.rememberProgress', next ? '1' : '0')
      if (!next) localStorage.removeItem(progressKey)
    } catch {
      // ignore storage errors
    }
  }

  const resetPlayer = () => {
    changeRate(1)
    const element = videoRef.current
    if (element) {
      element.volume = 0.9
      element.muted = false
    }
    setVolume(0.9)
    setMuted(false)
    seek(0)
    try {
      localStorage.removeItem(progressKey)
      localStorage.setItem('nowpass.video.volume', '0.9')
      localStorage.setItem('nowpass.video.muted', '0')
    } catch {
      // ignore storage errors
    }
    showVolumeHud(0.9, false)
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={shellRef}
      className={playing ? 'video-player-shell is-playing' : 'video-player-shell'}
      onMouseDown={startBoost}
      onMouseUp={stopBoost}
      onMouseLeave={stopBoost}
      onContextMenu={(event) => event.preventDefault()}
    >
      <video
        ref={videoRef}
        className="video-player"
        src={src}
        poster={poster}
        playsInline
        preload="metadata"
        onClick={() => void togglePlay()}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onWaiting={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onEnded={handleEnded}
        onError={handleError}
      />

      <DanmakuOverlay items={danmaku} currentTime={current} playing={playing} />

      {!playing && (
        <button type="button" className="video-center-play" onClick={() => void togglePlay()} aria-label="播放视频">
          <AppIcon icon="lucide:play" size={30} />
        </button>
      )}
      {waiting && <span className="video-buffering" aria-label="正在缓冲" />}

      <div className="video-player-topbar">
        <span className="video-player-title">{title}</span>
        {boost && <span className="video-boost-badge"><AppIcon icon="lucide:fast-forward" size={13} /> 2× 快进</span>}
      </div>

      <div className={volumeHud.visible ? 'video-volume-hud is-visible' : 'video-volume-hud'} aria-live="polite">
        <span className="video-volume-hud__icon"><AppIcon icon={volumeHud.muted || volumeHud.value === 0 ? 'lucide:volume-x' : 'lucide:volume-2'} size={18} /></span>
        <div className="video-volume-hud__body">
          <span>{volumeHud.muted || volumeHud.value === 0 ? '静音' : `${Math.round(volumeHud.value * 100)}%`}</span>
          <div className="video-volume-hud__track">
            <i style={{ width: `${volumeHud.muted ? 0 : volumeHud.value * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="video-player-controls" onClick={(event) => event.stopPropagation()}>
        <div
          ref={progressRef}
          className={seeking ? 'video-progress is-seeking' : 'video-progress'}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            progressInputRef.current?.focus({ preventScroll: true })
            setSeeking(true)
            seekToPointer(event.clientX)
          }}
          onPointerMove={(event) => {
            if (seeking) seekToPointer(event.clientX)
            else if (duration) {
              const rect = event.currentTarget.getBoundingClientRect()
              const percent = clamp((event.clientX - rect.left) / rect.width, 0, 1)
              setSeekPreview({ percent: percent * 100, time: percent * duration })
            }
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            setSeeking(false)
          }}
          onPointerCancel={() => setSeeking(false)}
          onPointerLeave={() => {
            if (!seeking) setSeekPreview(null)
          }}
          onDoubleClick={() => seek(0)}
        >
          <div className="video-progress__buffered" style={{ width: `${bufferedPercent}%` }} />
          <input
            ref={progressInputRef}
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="播放进度"
            aria-valuetext={`${formatVideoDuration(current)} / ${formatVideoDuration(duration)}`}
            style={{ '--progress': `${progress}%` } as CSSProperties}
          />
          {seekPreview && (
            <span className="video-progress__tooltip" style={{ left: `${seekPreview.percent}%` }}>
              {formatVideoDuration(seekPreview.time)}
            </span>
          )}
        </div>
        <div className="video-control-row">
          <button type="button" className="video-control-button" onClick={() => void togglePlay()} aria-label={playing ? '暂停' : '播放'} title={playing ? '暂停 (Space)' : '播放 (Space)'}>
            <AppIcon icon={playing ? 'lucide:pause' : 'lucide:play'} size={17} />
          </button>
          <div className={volumeHud.visible ? 'video-volume is-adjusting' : 'video-volume'}>
            <button type="button" className="video-control-button" onClick={toggleMute} aria-label={muted ? '取消静音' : '静音'} title={muted ? '取消静音 (M)' : '静音 (M)'}>
              <AppIcon icon={muted || volume === 0 ? 'lucide:volume-x' : 'lucide:volume-2'} size={17} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                const next = Number(event.target.value)
                const element = videoRef.current
                if (!element) return
                element.volume = next
                element.muted = next === 0
                setVolume(next)
                setMuted(next === 0)
                localStorage.setItem('nowpass.video.volume', String(next))
                showVolumeHud(next, next === 0)
              }}
              aria-label="音量"
              style={{ '--volume': `${(muted ? 0 : volume) * 100}%` } as CSSProperties}
            />
            <span className="video-volume-value mono">{muted || volume === 0 ? '静音' : `${Math.round(volume * 100)}%`}</span>
          </div>
          <span className="video-time mono">
            {formatVideoDuration(current)} <span>/</span> {formatVideoDuration(duration)}
          </span>
          <span className="video-control-spacer" />
          <label className="video-rate" title="播放速度">
            <span className="sr-only">播放速度</span>
            <select value={rate} onChange={(event) => changeRate(Number(event.target.value))} aria-label="播放速度">
              {RATE_OPTIONS.map((value) => <option key={value} value={value}>{value}×</option>)}
            </select>
          </label>
          <button
            type="button"
            className={showSettings ? 'video-control-button is-active' : 'video-control-button'}
            onClick={() => {
              setShowSettings((visible) => !visible)
              setShowShortcuts(false)
            }}
            aria-label="播放设置"
            aria-expanded={showSettings}
            title="播放设置"
          >
            <AppIcon icon="lucide:settings-2" size={17} />
          </button>
          <button type="button" className="video-control-button" onClick={() => { setShowShortcuts((visible) => !visible); setShowSettings(false) }} aria-label="快捷键说明" title="快捷键说明 (/)">
            <AppIcon icon="lucide:keyboard" size={17} />
          </button>
          <button type="button" className={wide ? 'video-control-button is-active' : 'video-control-button'} onClick={onToggleWide} aria-label={wide ? '退出宽屏' : '宽屏模式'} title={wide ? '退出宽屏 (W)' : '宽屏模式 (W)'}>
            <AppIcon icon={wide ? 'lucide:minimize-2' : 'lucide:rectangle-horizontal'} size={17} />
          </button>
          <button type="button" className="video-control-button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? '退出全屏' : '全屏'} title={isFullscreen ? '退出全屏 (F)' : '全屏 (F)'}>
            <AppIcon icon={isFullscreen ? 'lucide:minimize' : 'lucide:maximize'} size={17} />
          </button>
        </div>
      </div>

      {showShortcuts && (
        <div className="video-shortcuts" role="dialog" aria-label="播放器快捷键">
          <div className="video-shortcuts__head">
            <strong>播放器快捷键</strong>
            <button type="button" onClick={() => setShowShortcuts(false)} aria-label="关闭快捷键说明"><AppIcon icon="lucide:x" size={15} /></button>
          </div>
          <dl>
            <div><dt>Space / K</dt><dd>播放 / 暂停</dd></div>
            <div><dt>←</dt><dd>后退 5 秒</dd></div>
            <div><dt>→</dt><dd>前进 5 秒</dd></div>
            <div><dt>长按 →</dt><dd>2× 快进</dd></div>
            <div><dt>↑ / ↓</dt><dd>音量 + / -</dd></div>
            <div><dt>M</dt><dd>静音切换</dd></div>
            <div><dt>F</dt><dd>全屏</dd></div>
            <div><dt>W</dt><dd>宽屏模式</dd></div>
            <div><dt>按住鼠标右键</dt><dd>2× 快进</dd></div>
          </dl>
        </div>
      )}

      {showSettings && (
        <div className="video-settings" role="dialog" aria-label="播放设置">
          <div className="video-settings__head">
            <strong>播放设置</strong>
            <button type="button" onClick={() => setShowSettings(false)} aria-label="关闭播放设置"><AppIcon icon="lucide:x" size={15} /></button>
          </div>
          <div className="video-settings__section">
            <span className="video-settings__label">播放速度</span>
            <div className="video-settings__chips">
              {RATE_OPTIONS.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={rate === value ? 'video-setting-chip is-active' : 'video-setting-chip'}
                  onClick={() => changeRate(value)}
                >
                  {value}×
                </button>
              ))}
            </div>
          </div>
          <div className="video-settings__row">
            <span>记住播放位置</span>
            <button
              type="button"
              role="switch"
              aria-checked={rememberProgress}
              className={rememberProgress ? 'video-switch is-on' : 'video-switch'}
              onClick={toggleRemember}
              aria-label="记住播放位置"
            >
              <span />
            </button>
          </div>
          <button type="button" className="video-settings__reset" onClick={resetPlayer}>
            <AppIcon icon="lucide:rotate-ccw" size={14} /> 恢复默认音量与倍速
          </button>
        </div>
      )}

      {error && <div className="video-player-error" role="alert">{error}</div>}
    </div>
  )
}
