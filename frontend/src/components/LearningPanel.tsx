import { useState } from 'react'
import { Empty, Skeleton, Tabs, Tag } from 'antd'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { InterviewSessionItem, SelfRating } from '@nowpass/api-contracts'
import { interviewHistoryApi, learningApi } from '@/api/learning'
import { AppIcon } from '@/components/AppIcon'
import { MarkdownView } from '@/components/MarkdownView'
import { formatDate } from '@/lib/format'

const RATING_LABEL: Record<SelfRating, { text: string; color: string }> = {
  known: { text: '会', color: 'green' },
  unsure: { text: '模糊', color: 'gold' },
  unknown: { text: '不会', color: 'red' },
}

export function LearningPanel() {
  const [activeSession, setActiveSession] = useState<InterviewSessionItem | null>(null)
  const summary = useQuery({ queryKey: ['learning-summary'], queryFn: learningApi.summary })
  const favorites = useQuery({ queryKey: ['learning-favorites'], queryFn: () => learningApi.favorites(1, 50) })
  const progress = useQuery({ queryKey: ['learning-progress'], queryFn: () => learningApi.progress(1, 50) })
  const sessions = useQuery({ queryKey: ['interview-sessions'], queryFn: () => interviewHistoryApi.list(1, 30) })
  const sessionDetail = useQuery({
    queryKey: ['interview-session', activeSession?.id],
    queryFn: () => interviewHistoryApi.detail(activeSession!.id),
    enabled: activeSession !== null,
  })

  const data = summary.data

  return (
    <section className="surface-card learning-panel" aria-labelledby="learning-title">
      <div className="learning-panel__head">
        <div>
          <p className="eyebrow">MY LEARNING</p>
          <h2 id="learning-title">学习记录</h2>
        </div>
      </div>

      {summary.isPending ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <div className="learning-stats">
          <div><strong className="mono">{data?.favoriteCount ?? 0}</strong><span>收藏</span></div>
          <div><strong className="mono">{data?.viewedCount ?? 0}</strong><span>已读</span></div>
          <div><strong className="mono">{data?.knownCount ?? 0}</strong><span>会</span></div>
          <div><strong className="mono">{data?.unsureCount ?? 0}</strong><span>模糊</span></div>
          <div><strong className="mono">{data?.unknownCount ?? 0}</strong><span>不会</span></div>
          <div><strong className="mono">{data?.interviewCount ?? 0}</strong><span>面试场次</span></div>
        </div>
      )}

      <Tabs
        className="learning-tabs"
        items={[
          {
            key: 'favorites',
            label: `收藏 ${data?.favoriteCount ?? 0}`,
            children: favorites.isPending ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (favorites.data?.rows.length ?? 0) === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有收藏题目" />
            ) : (
              <ul className="learning-list">
                {favorites.data?.rows.map((item) => (
                  <li key={item.questionId}>
                    <Link to={`/questions/${item.questionId}`} state={{ from: '/profile' }}>
                      <span className="learning-list__title">{item.title}</span>
                      <span className="learning-list__meta">
                        {item.categoryName ?? '未分类'} · {formatDate(item.createTime)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ),
          },
          {
            key: 'progress',
            label: `刷题记录 ${data?.viewedCount ?? 0}`,
            children: progress.isPending ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (progress.data?.rows.length ?? 0) === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有刷题记录" />
            ) : (
              <ul className="learning-list">
                {progress.data?.rows.map((item) => (
                  <li key={item.questionId}>
                    <Link to={`/questions/${item.questionId}`} state={{ from: '/profile' }}>
                      <span className="learning-list__title">{item.title}</span>
                      <span className="learning-list__meta">
                        {item.categoryName ?? '未分类'} · 看过 {item.viewCount} 次 · {formatDate(item.lastViewAt)}
                      </span>
                    </Link>
                    {item.selfRating && (
                      <Tag bordered={false} color={RATING_LABEL[item.selfRating].color}>
                        {RATING_LABEL[item.selfRating].text}
                      </Tag>
                    )}
                  </li>
                ))}
              </ul>
            ),
          },
          {
            key: 'sessions',
            label: `面试历史 ${data?.interviewCount ?? 0}`,
            children: sessions.isPending ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (sessions.data?.rows.length ?? 0) === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有面试记录" />
            ) : (
              <ul className="learning-list">
                {sessions.data?.rows.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="learning-list__button" onClick={() => setActiveSession(item)}>
                      <span className="learning-list__title">{item.questionTitle}</span>
                      <span className="learning-list__meta">
                        {formatDate(item.startedAt)} · {item.messageCount} 条对话
                        {item.hasReport ? ' · 已生成点评' : ''}
                      </span>
                    </button>
                    <AppIcon icon="lucide:chevron-right" size={15} />
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />

      {activeSession && (
        <div className="learning-session" role="dialog" aria-label="面试详情">
          <div className="learning-session__head">
            <div>
              <p className="eyebrow">SESSION #{activeSession.id}</p>
              <h3>{activeSession.questionTitle}</h3>
            </div>
            <button type="button" className="learning-session__close" aria-label="关闭" onClick={() => setActiveSession(null)}>
              <AppIcon icon="lucide:x" size={16} />
            </button>
          </div>
          {sessionDetail.isPending ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : (
            <>
              <div className="learning-session__messages">
                {sessionDetail.data?.messages.map((message, index) => (
                  <div key={index} className={`learning-session__message is-${message.role}`}>
                    <span className="learning-session__role">{message.role === 'user' ? '我' : '面试官'}</span>
                    {message.role === 'assistant'
                      ? <MarkdownView>{message.content}</MarkdownView>
                      : <p>{message.content}</p>}
                  </div>
                ))}
              </div>
              {sessionDetail.data?.reportMd && (
                <div className="learning-session__report">
                  <p className="eyebrow">REVIEW</p>
                  <MarkdownView>{sessionDetail.data.reportMd}</MarkdownView>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
