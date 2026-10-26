import { useMemo, useState } from 'react'
import { Alert, Button, Drawer, Skeleton, Tag } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined, LockOutlined } from '@ant-design/icons'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/api/catalog'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { ErrorState } from '@/components/ErrorState'
import { MarkdownView } from '@/components/MarkdownView'
import { useIsMobile } from '@/hooks/useIsMobile'

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

function AnswerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="answer-panel__header">
      <div>
        <p className="eyebrow">ANSWER NOTE / 附页</p>
        <h2 id="answer-title">标准答案</h2>
      </div>
      <Button type="text" aria-label="收起标准答案" icon={<CloseOutlined />} onClick={onClose} />
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

  const question = useQuery({
    queryKey: ['question', questionId],
    queryFn: () => catalogApi.getQuestion(questionId),
    enabled: Number.isFinite(questionId) && questionId > 0,
  })

  const backTo = useMemo(() => {
    const state = location.state as { from?: string } | null
    return state?.from && state.from.startsWith('/') ? state.from : '/'
  }, [location.state])

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
      </div>
    </>
  )

  return (
    <div className="page-container reading-page">
      <Link to={backTo} className="back-link">
        <ArrowLeftOutlined aria-hidden="true" /> 返回题库
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
            </div>
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
                      {active && <CheckOutlined aria-hidden="true" />}
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
              icon={<LockOutlined aria-hidden="true" />}
              aria-expanded={revealed}
              aria-controls="answer-region"
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? '收起标准答案' : '我先想好了，查看标准答案'}
            </Button>
          </section>
        </article>

        {!isMobile && revealed && (
          <aside id="answer-region" className="answer-panel" aria-labelledby="answer-title">
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

      {revealed && !isMobile && (
        <Alert
          type="info"
          showIcon
          className="reading-note"
          message="附页已打开"
          description="按 Esc 或点击附页右上角的关闭按钮可以收起。"
        />
      )}
    </div>
  )
}
