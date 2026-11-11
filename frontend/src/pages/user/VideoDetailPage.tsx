import { useState } from 'react'
import { Alert, App as AntApp, Button, Input, Tag } from 'antd'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppIcon } from '@/components/AppIcon'
import { VideoComments } from '@/components/VideoComments'
import { VideoPlayer } from '@/components/VideoPlayer'
import { videoApi } from '@/api/videos'
import { useAuthStore } from '@/store/auth'
import { formatDate, formatVideoDuration } from '@/lib/format'

export function VideoDetailPage() {
  const { id } = useParams()
  const videoId = Number(id)
  const [wide, setWide] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [danmakuText, setDanmakuText] = useState('')
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()

  const video = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => videoApi.detail(videoId),
    enabled: Number.isFinite(videoId) && videoId > 0,
  })

  const danmaku = useQuery({
    queryKey: ['video-danmaku', videoId],
    queryFn: () => videoApi.danmaku(videoId),
    enabled: Number.isFinite(videoId) && videoId > 0,
  })

  const sendDanmaku = useMutation({
    mutationFn: (text: string) =>
      videoApi.sendDanmaku(videoId, {
        content: text,
        timeMs: Math.max(0, Math.round(currentTime * 1000)),
        color: '#ffffff',
        mode: 'scroll',
      }),
    onSuccess: () => {
      setDanmakuText('')
      void queryClient.invalidateQueries({ queryKey: ['video-danmaku', videoId] })
    },
    onError: (error) => {
      message.error(error instanceof Error ? error.message : '弹幕发送失败')
    },
  })

  const submitDanmaku = () => {
    const text = danmakuText.trim()
    if (!text) {
      message.warning('先写一条弹幕')
      return
    }
    sendDanmaku.mutate(text)
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
    <div className={wide ? 'page-container video-detail-page is-wide' : 'page-container video-detail-page'}>
      <Link className="back-link" to="/videos">
        <AppIcon icon="lucide:arrow-left" size={16} /> 返回视频库
      </Link>

      <div className="video-detail-layout">
        <main className="video-detail-main">
          <header className="video-detail-head">
            <p className="eyebrow">{detail.categoryName ?? 'VIDEO NOTES'} / {formatDate(detail.publishedAt)}</p>
            <h1>{detail.title}</h1>
            <div className="video-detail-meta">
              <span><AppIcon icon="lucide:user-round" size={14} /> {detail.speaker || 'NowPass 讲师'}</span>
              <span><AppIcon icon="lucide:clock-3" size={14} /> {formatVideoDuration(detail.durationSeconds)}</span>
            </div>
          </header>

          <VideoPlayer
            src={detail.playUrl}
            poster={detail.coverUrl ?? undefined}
            title={detail.title}
            progressKey={`nowpass.video.progress.${detail.id}`}
            wide={wide}
            onToggleWide={() => setWide((value) => !value)}
            danmaku={danmaku.data ?? []}
            onTimeUpdate={setCurrentTime}
          />

          <section className="video-danmaku-compose" aria-label="发送弹幕">
            <div className="video-danmaku-compose__label">
              <AppIcon icon="lucide:message-square-text" size={15} />
              <span>弹幕</span>
              <span className="mono">{currentTime > 0 ? `${Math.floor(currentTime)}s` : '00:00'}</span>
            </div>
            {user ? (
              <div className="video-danmaku-compose__row">
                <Input
                  value={danmakuText}
                  onChange={(event) => setDanmakuText(event.target.value)}
                  onPressEnter={submitDanmaku}
                  placeholder="在当前位置发一条弹幕，按 Enter 发送"
                  maxLength={60}
                  aria-label="弹幕内容"
                />
                <Button type="primary" loading={sendDanmaku.isPending} onClick={submitDanmaku}>
                  发送
                </Button>
              </div>
            ) : (
              <p className="video-danmaku-compose__login">
                <Link to="/login">登录</Link> 后可发送弹幕。
              </p>
            )}
          </section>

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

          <VideoComments videoId={detail.id} />

          {detail.questionId && (
            <Link className="video-related-question" to={`/questions/${detail.questionId}`}>
              <span>关联面试题</span>
              <strong>{detail.questionTitle ?? `题目 #${detail.questionId}`}</strong>
              <AppIcon icon="lucide:arrow-right" size={16} />
            </Link>
          )}
        </main>
      </div>
    </div>
  )
}
