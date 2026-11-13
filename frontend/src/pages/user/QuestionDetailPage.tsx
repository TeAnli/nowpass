import { useEffect, useMemo, useRef, useState } from 'react'
import { App as AntApp, Button, Drawer, Skeleton, Tag, Tooltip } from 'antd'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SelfRating } from '@nowpass/api-contracts'
import { catalogApi } from '@/api/catalog'
import { learningApi } from '@/api/learning'
import { AppIcon } from '@/components/AppIcon'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { ErrorState } from '@/components/ErrorState'
import { MarkdownView } from '@/components/MarkdownView'
import { useIsMobile } from '@/hooks/useIsMobile'
import { animateIn, canAnimate } from '@/lib/gsap'

function AnswerBody({ questionId }: { questionId: number }) {
  const answer = useQuery({
    queryKey: ['answer', questionId],
    queryFn: () => catalogApi.getAnswer(questionId),
    retry: 1,
  })

  if (answer.isPending) {
    return <Skeleton active paragraph={{ rows: 8 }} title={{ width: '36%' }} />
  }
  if (answer.isError) {
    return <ErrorState title="答案暂时取不到" error={answer.error} onRetry={() => void answer.refetch()} />
  }
  if (!answer.data) return null

  return (
    <>
      {answer.data.answerKey && (
        <div className="answer-key">
          <span className="eyebrow">ANSWER KEY</span>
          <strong className="mono">{answer.data.answerKey}</strong>
        </div>
      )}
      <MarkdownView>{answer.data.answerMd}</MarkdownView>
    </>
  )
}

const RATING_OPTIONS: Array<{ value: SelfRating; label: string; icon: string }> = [
  { value: 'known', label: '会', icon: 'lucide:check' },
  { value: 'unsure', label: '模糊', icon: 'lucide:circle-help' },
  { value: 'unknown', label: '不会', icon: 'lucide:x' },
]

function SelfRatingBar({ questionId }: { questionId: number }) {
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()
  const [rated, setRated] = useState<SelfRating | null>(null)
  const rate = useMutation({
    mutationFn: (value: SelfRating) => learningApi.recordProgress(questionId, { selfRating: value }),
    onSuccess: (_data, value) => {
      setRated(value)
      void queryClient.invalidateQueries({ queryKey: ['learning-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['learning-progress'] })
      message.success('已记录掌握度')
    },
    onError: () => message.error('记录失败，请稍后再试'),
  })

  return (
    <div className="self-rating">
      <p className="self-rating__title">这道题，你现在掌握到什么程度？</p>
      <div className="self-rating__options">
        {RATING_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={rated === option.value ? 'self-rating__item is-active' : 'self-rating__item'}
            aria-pressed={rated === option.value}
            disabled={rate.isPending}
            onClick={() => rate.mutate(option.value)}
          >
            <AppIcon icon={option.icon} size={14} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function AnswerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="answer-panel__header">
      <div>
        <p className="eyebrow">ANSWER NOTE / 附页</p>
        <h2 id="answer-title">标准答案</h2>
      </div>
      <Button type="text" aria-label="收起标准答案" icon={<AppIcon icon="lucide:x" size={18} />} onClick={onClose} />
    </div>
  )
}

export function QuestionDetailPage() {
  const params = useParams()
  const location = useLocation()
  const questionId = Number(params.id)
  const isMobile = useIsMobile('(max-width: 900px)')
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const answerPanelRef = useRef<HTMLElement | null>(null)
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()

  const question = useQuery({
    queryKey: ['question', questionId],
    queryFn: () => catalogApi.getQuestion(questionId),
    enabled: Number.isFinite(questionId) && questionId > 0,
  })

  const favorite = useQuery({
    queryKey: ['favorite-state', questionId],
    queryFn: () => learningApi.favoriteState(questionId),
    enabled: Number.isFinite(questionId) && questionId > 0,
  })

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (favorite.data?.favorite) await learningApi.removeFavorite(questionId)
      else await learningApi.addFavorite(questionId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorite-state', questionId] })
      void queryClient.invalidateQueries({ queryKey: ['learning-favorites'] })
      void queryClient.invalidateQueries({ queryKey: ['learning-summary'] })
      message.success(favorite.data?.favorite ? '已取消收藏' : '已加入收藏')
    },
    onError: () => message.error('操作失败，请稍后再试'),
  })

  useEffect(() => {
    if (!Number.isFinite(questionId) || questionId <= 0) return
    void learningApi.recordProgress(questionId, {}).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['learning-summary'] })
      void queryClient.invalidateQueries({ queryKey: ['learning-progress'] })
    }).catch(() => undefined)
  }, [questionId, queryClient])

  useEffect(() => {
    if (!revealed || !Number.isFinite(questionId) || questionId <= 0) return
    void learningApi.recordProgress(questionId, { answerRevealed: true }).catch(() => undefined)
  }, [revealed, questionId])

  const backTo = useMemo(() => {
    const state = location.state as { from?: string } | null
    return state?.from && state.from.startsWith('/') ? state.from : '/'
  }, [location.state])

  useEffect(() => {
    if (!revealed || isMobile) return
    const element = answerPanelRef.current
    if (!element || !canAnimate()) return
    const tween = animateIn(element, { y: 24, duration: 0.42, ease: 'power3.out' })
    const timer = window.setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => {
      window.clearTimeout(timer)
      tween.kill()
    }
  }, [isMobile, revealed])

  if (!Number.isFinite(questionId) || questionId <= 0) {
    return <ErrorState title="题目编号不正确" error={new Error('请返回题库重新选择题目。')} />
  }

  if (question.isPending) {
    return (
      <div className="page-container reading-page">
        <Skeleton active paragraph={{ rows: 10 }} title={{ width: '60%' }} />
      </div>
    )
  }

  if (question.isError || !question.data) {
    return (
      <div className="page-container reading-page">
        <ErrorState error={question.error} onRetry={() => void question.refetch()} />
      </div>
    )
  }

  const detail = question.data

  const toggleOption = (key: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const answerContent = (
    <>
      <AnswerHeader onClose={() => setRevealed(false)} />
      <div className="answer-panel__body">
        <p className="answer-panel__hint">
          先在心里答一遍，再对照。这里不做判分，答案只负责把话说清楚。
        </p>
        <AnswerBody questionId={questionId} />
        <SelfRatingBar questionId={questionId} />
      </div>
    </>
  )

  return (
    <div className="page-container reading-page">
      <Link to={backTo} className="back-link">
        <AppIcon icon="lucide:arrow-left" size={16} /> 返回题库
      </Link>

      <div className={revealed && !isMobile ? 'reading-grid is-answer-open' : 'reading-grid'}>
        <article className="reading-article" aria-labelledby="question-title">
          <header className="reading-article__head">
            <p className="eyebrow">
              {detail.categoryName ?? '未分类'} / QUESTION {String(detail.id).padStart(3, '0')}
            </p>
            <h1 id="question-title">{detail.title}</h1>
            <div className="reading-meta">
              <DifficultyBadge value={detail.difficulty} />
              {detail.tags.map((tag) => (
                <Tag key={tag} bordered={false} className="tag-plain">
                  {tag}
                </Tag>
              ))}
              <Tooltip title={favorite.data?.favorite ? '取消收藏' : '收藏这道题'}>
                <Button
                  size="small"
                  className={favorite.data?.favorite ? 'favorite-button is-active' : 'favorite-button'}
                  aria-pressed={Boolean(favorite.data?.favorite)}
                  loading={toggleFavorite.isPending}
                  onClick={() => toggleFavorite.mutate()}
                  icon={<AppIcon icon={favorite.data?.favorite ? 'lucide:bookmark-check' : 'lucide:bookmark'} size={14} />}
                >
                  {favorite.data?.favorite ? '已收藏' : '收藏'}
                </Button>
              </Tooltip>
            </div>
            <Link className="ai-interview-entry" to={`/interview?questionId=${detail.id}`}>
              <AppIcon icon="lucide:bot" size={16} />
              和 AI 面试官聊聊这道题
              <AppIcon icon="lucide:arrow-right" size={15} />
            </Link>
          </header>

          <MarkdownView className="question-content">{detail.contentMd}</MarkdownView>

          {detail.options && detail.options.length > 0 && (
            <section className="option-section" aria-labelledby="options-title">
              <div className="section-label">
                <span className="eyebrow">OPTIONS</span>
                <h2 id="options-title">先选一个你的判断</h2>
              </div>
              <p className="option-section__hint">
                选择不会判分，也不会提前显示答案。只是让你带着一个判断去核对。
              </p>
              <div className="option-list">
                {detail.options.map((option) => {
                  const active = selected.has(option.key)
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={active ? 'option-item is-selected' : 'option-item'}
                      aria-pressed={active}
                      onClick={() => toggleOption(option.key)}
                    >
                      <span className="option-item__key mono">{option.key}</span>
                      <span>{option.text}</span>
                      {active && <AppIcon icon="lucide:check" size={17} />}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section className="answer-trigger" aria-labelledby="answer-trigger-title">
            <div className="answer-trigger__copy">
              <p className="eyebrow">BEFORE YOU LOOK</p>
              <h2 id="answer-trigger-title">答案在这里，但先别急。</h2>
              <p>
                {selected.size > 0
                  ? `你已经选了 ${Array.from(selected).join('、')}。现在可以打开附页核对了。`
                  : '试着用 30 秒说出你的思路，再打开标准答案。'}
              </p>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<AppIcon icon="lucide:eye" size={18} />}
              aria-expanded={revealed}
              aria-controls="answer-region"
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? '收起标准答案' : '我先想好了，查看标准答案'}
            </Button>
          </section>
        </article>

        {!isMobile && revealed && (
          <aside id="answer-region" ref={answerPanelRef} className="answer-panel" aria-labelledby="answer-title">
            {answerContent}
          </aside>
        )}
      </div>

      {isMobile && (
        <Drawer
          open={revealed}
          placement="bottom"
          height="88vh"
          onClose={() => setRevealed(false)}
          closable={false}
          className="answer-drawer"
          title={null}
        >
          <div id="answer-region" className="answer-panel answer-panel--mobile" aria-labelledby="answer-title">
            {answerContent}
          </div>
        </Drawer>
      )}
    </div>
  )
}
