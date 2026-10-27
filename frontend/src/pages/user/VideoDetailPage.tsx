import { useEffect, useRef, useState } from 'react'
import { Alert, Tag } from 'antd'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/AppIcon'
import { videoApi } from '@/api/videos'
import { formatDate, formatVideoDuration } from '@/lib/format'

function progressKey(id: number) {
  return `nowpass.video.progress.${id}`
}

export function VideoDetailPage() {
  const { id } = useParams()
  const videoId = Number(id)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastSavedRef = useRef(0)
  const [playError, setPlayError] = useState<string | null>(null)

  const video = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => videoApi.detail(videoId),
    enabled: Number.isFinite(videoId) && videoId > 0,
  })

  useEffect(() => {
    const element = videoRef.current
    if (!element) return
    const savedRate = Number(localStorage.getItem('nowpass.video.rate') || '1')
    if (Number.isFinite(savedRate) && savedRate >= 0.5 && savedRate <= 2) {
      element.playbackRate = savedRate
    }
  }, [video.data?.playUrl])

  const handleLoadedMetadata = () => {
    const element = videoRef.current
    if (!element || !video.data) return
    const saved = Number(localStorage.getItem(progressKey(video.data.id)) || '0')
    if (Number.isFinite(saved) && saved > 3 && saved < element.duration - 3) {
      element.currentTime = saved
    }
    const savedRate = Number(localStorage.getItem('nowpass.video.rate') || '1')
    if (Number.isFinite(savedRate) && savedRate >= 0.5 && savedRate <= 2) {
      element.playbackRate = savedRate
    }
  }

  const handleTimeUpdate = () => {
    const element = videoRef.current
    if (!element || !video.data) return
    const current = Math.floor(element.currentTime)
    if (Math.abs(current - lastSavedRef.current) < 2) return
    lastSavedRef.current = current
    try {
      localStorage.setItem(progressKey(video.data.id), String(current))
    } catch {
      // ignore storage quota
    }
  }

  const handleRateChange = () => {
    const rate = videoRef.current?.playbackRate
    if (rate) localStorage.setItem('nowpass.video.rate', String(rate))
  }

  const handleEnded = () => {
    if (video.data) localStorage.removeItem(progressKey(video.data.id))
  }

  const handleError = () => {
    setPlayError('播放地址可能已过期或视频文件不可用，请刷新页面重试。')
  }

  if (video.isPending) {
    return <div className="page-container videos-state">正在读取视频…</div>
  }

  if (video.isError || !video.data) {
    return (
      <div className="page-container videos-state">
        <Alert type="error" showIcon message="视频不存在或尚未发布" />
        <Link className="back-link" to="/videos"><AppIcon icon="lucide:arrow-left" size={16} /> 返回视频库</Link>
      </div>
    )
  }

  const detail = video.data

  return (
    <div className="page-container video-detail-page">
      <Link className="back-link" to="/videos">
        <AppIcon icon="lucide:arrow-left" size={16} /> 返回视频库
      </Link>

      <div className="video-detail-layout">
        <main className="video-detail-main">
          <div className="video-player-shell">
            <video
              ref={videoRef}
              key={detail.playUrl}
              className="video-player"
              src={detail.playUrl}
              poster={detail.coverUrl ?? undefined}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onRateChange={handleRateChange}
              onEnded={handleEnded}
              onError={handleError}
            />
          </div>
          {playError && <Alert className="video-play-error" type="warning" showIcon message={playError} />}

          <header className="video-detail-head">
            <p className="eyebrow">{detail.categoryName ?? 'VIDEO NOTES'} / {formatDate(detail.publishedAt)}</p>
            <h1>{detail.title}</h1>
            <div className="video-detail-meta">
              <span><AppIcon icon="lucide:user-round" size={14} /> {detail.speaker || 'NowPass 讲师'}</span>
              <span><AppIcon icon="lucide:clock-3" size={14} /> {formatVideoDuration(detail.durationSeconds)}</span>
            </div>
          </header>

          {detail.description && (
            <p className="video-detail-description">{detail.description}</p>
          )}

          {detail.tags.length > 0 && (
            <div className="video-detail-tags">
              {detail.tags.map((tag) => (
                <Link key={tag} to={`/videos?tag=${encodeURIComponent(tag)}`}>
                  <Tag bordered={false}>#{tag}</Tag>
                </Link>
              ))}
            </div>
          )}

          {detail.questionId && (
            <Link className="video-related-question" to={`/questions/${detail.questionId}`}>
              <span>关联面试题</span>
              <strong>{detail.questionTitle ?? `题目 #${detail.questionId}`}</strong>
              <AppIcon icon="lucide:arrow-right" size={16} />
            </Link>
          )}
        </main>

        <aside className="video-detail-aside">
          <p className="eyebrow">WATCH NOTE</p>
          <h2>看得懂，也要讲得出。</h2>
          <p>进度和倍速会保存在当前浏览器。看完后回到题目详情，用自己的话复述一遍，再进入 AI 面试间练习。</p>
          <Link className="hero-action hero-action--primary" to="/interview">
            <AppIcon icon="lucide:bot" size={16} /> 去 AI 面试
          </Link>
          <Link className="video-aside-link" to="/questions">
            回到题库 <AppIcon icon="lucide:arrow-up-right" size={14} />
          </Link>
        </aside>
      </div>
    </div>
  )
}
