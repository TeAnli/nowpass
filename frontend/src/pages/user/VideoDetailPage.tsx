import { useState } from 'react'
import { Alert, Tag } from 'antd'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/AppIcon'
import { VideoPlayer } from '@/components/VideoPlayer'
import { videoApi } from '@/api/videos'
import { formatDate, formatVideoDuration } from '@/lib/format'

export function VideoDetailPage() {
  const { id } = useParams()
  const videoId = Number(id)
  const [wide, setWide] = useState(false)

  const video = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => videoApi.detail(videoId),
    enabled: Number.isFinite(videoId) && videoId > 0,
  })

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
          />

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
      </div>
    </div>
  )
}
