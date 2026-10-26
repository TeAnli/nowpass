import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Empty, Input, Pagination, Select, Skeleton, Tag } from 'antd'
import { AppIcon } from '@/components/AppIcon'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/api/catalog'
import type { Difficulty, QuestionQuery } from '@/types/api'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { ErrorState } from '@/components/ErrorState'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { animateStagger, canAnimate } from '@/lib/gsap'

const PAGE_SIZE = 10

export function QuestionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = Number(searchParams.get('categoryId')) || null
  const difficulty = (searchParams.get('difficulty') as Difficulty | null) ?? null
  const tag = searchParams.get('tag')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const keywordFromUrl = searchParams.get('keyword') ?? ''
  const [keyword, setKeyword] = useState(keywordFromUrl)
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 350)

  useEffect(() => {
    setKeyword(keywordFromUrl)
  }, [keywordFromUrl])

  useEffect(() => {
    if (debouncedKeyword === keywordFromUrl) return
    const next = new URLSearchParams(searchParams)
    if (debouncedKeyword) next.set('keyword', debouncedKeyword)
    else next.delete('keyword')
    next.delete('page')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword])

  const query = useMemo<QuestionQuery>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      categoryId,
      difficulty,
      tag: tag || null,
      keyword: keywordFromUrl || null,
    }),
    [categoryId, difficulty, keywordFromUrl, page, tag],
  )

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories })
  const allTags = useQuery({
    queryKey: ['question-tags'],
    queryFn: () => catalogApi.listQuestions({ page: 1, pageSize: 200 }),
    staleTime: 5 * 60 * 1000,
  })
  const questions = useQuery({
    queryKey: ['questions', query],
    queryFn: () => catalogApi.listQuestions(query),
    placeholderData: keepPreviousData,
  })
  const listRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    const container = listRef.current
    if (!container || !questions.data?.rows.length || !canAnimate()) return
    const rows = container.querySelectorAll('.question-list__item')
    const tween = animateStagger(rows, { duration: 0.3, stagger: 0.045 })
    return () => {
      tween.kill()
    }
  }, [questions.dataUpdatedAt, questions.data?.rows.length])

  const tagOptions = useMemo(() => {
    const values = new Set<string>()
    allTags.data?.rows.forEach((item) => item.tags.forEach((value) => values.add(value)))
    return Array.from(values)
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))
      .map((value) => ({ label: value, value }))
  }, [allTags.data])

  const updateFilter = (key: string, value: string | number | null | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, String(value))
    next.delete('page')
    setSearchParams(next)
  }

  const clearFilters = () => {
    setKeyword('')
    setSearchParams(new URLSearchParams())
  }

  const hasFilters = Boolean(categoryId || difficulty || tag || keywordFromUrl)

  return (
    <div className="page-container question-index">
      <header className="page-heading">
        <p className="eyebrow">THE QUESTION INDEX / 题库</p>
        <div className="page-heading__row">
          <h1>今天读哪一道？</h1>
          <span className="result-count mono">
            {questions.data ? `${questions.data.total} 道题` : '正在翻阅…'}
          </span>
        </div>
        <p className="page-heading__lead">
          按主题或难度挑一道。题干里没有答案，想清楚之后再打开右侧附页。
        </p>
      </header>

      <section className="filters" aria-label="题目筛选">
        <div className="category-strip" role="group" aria-label="按分类筛选">
          <button
            type="button"
            className={!categoryId ? 'category-chip is-active' : 'category-chip'}
            onClick={() => updateFilter('categoryId', null)}
            aria-pressed={!categoryId}
          >
            全部
          </button>
          {categories.data?.map((category) => (
            <button
              key={category.id}
              type="button"
              className={categoryId === category.id ? 'category-chip is-active' : 'category-chip'}
              onClick={() => updateFilter('categoryId', category.id)}
              aria-pressed={categoryId === category.id}
            >
              {category.name}
              <span className="category-chip__count">{category.questionCount}</span>
            </button>
          ))}
        </div>

        <div className="filter-controls">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            allowClear
            prefix={<AppIcon icon="lucide:search" size={17} />}
            placeholder="搜索题目标题…"
            aria-label="搜索题目标题"
            className="filter-search"
          />
          <Select
            allowClear
            value={difficulty ?? undefined}
            onChange={(value) => updateFilter('difficulty', value)}
            placeholder="全部难度"
            aria-label="按难度筛选"
            options={[
              { value: 'easy', label: '基础' },
              { value: 'medium', label: '进阶' },
              { value: 'hard', label: '深入' },
            ]}
          />
          <Select
            allowClear
            showSearch
            value={tag ?? undefined}
            onChange={(value) => updateFilter('tag', value)}
            placeholder="全部标签"
            aria-label="按标签筛选"
            optionFilterProp="label"
            options={tagOptions}
            loading={allTags.isPending}
          />
          {hasFilters && (
            <Button type="link" onClick={clearFilters}>
              清空筛选
            </Button>
          )}
        </div>
      </section>

      {questions.isError ? (
        <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />
      ) : questions.isPending ? (
        <div className="question-list" aria-busy="true" aria-live="polite">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="question-row-skeleton">
              <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1, width: ['30%'] }} />
            </div>
          ))}
        </div>
      ) : questions.data && questions.data.rows.length > 0 ? (
        <>
          <ol className="question-list" ref={listRef}>
            {questions.data.rows.map((question, index) => (
              <li key={question.id} className="question-list__item">
                <Link
                  to={`/questions/${question.id}`}
                  state={{ from: `/${searchParams.toString()}` }}
                  className="question-row"
                >
                  <span className="question-row__index mono">
                    {String((page - 1) * PAGE_SIZE + index + 1).padStart(2, '0')}
                  </span>
                  <span className="question-row__body">
                    <span className="question-row__title">{question.title}</span>
                    <span className="question-row__meta">
                      <span>{question.categoryName ?? '未分类'}</span>
                      {question.tags.slice(0, 3).map((item) => (
                        <Tag key={item} bordered={false} className="tag-plain">
                          {item}
                        </Tag>
                      ))}
                    </span>
                  </span>
                  <DifficultyBadge value={question.difficulty} />
                  <span className="question-row__arrow" aria-hidden="true">
                    <AppIcon icon="lucide:arrow-up-right" size={18} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <div className="pagination-row">
            <Pagination
              current={questions.data.page}
              pageSize={questions.data.pageSize}
              total={questions.data.total}
              showSizeChanger={false}
              hideOnSinglePage={questions.data.total <= PAGE_SIZE}
              onChange={(nextPage) => {
                const next = new URLSearchParams(searchParams)
                if (nextPage <= 1) next.delete('page')
                else next.set('page', String(nextPage))
                setSearchParams(next)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              showTotal={(total) => `共 ${total} 道题`}
            />
          </div>
        </>
      ) : (
        <div className="empty-panel">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasFilters ? '这个筛选组合下暂时没有题目。' : '题库还是空的，等管理员放题目进来。'}
          >
            {hasFilters && (
              <Button type="primary" onClick={clearFilters}>
                清空筛选
              </Button>
            )}
          </Empty>
        </div>
      )}
    </div>
  )
}
