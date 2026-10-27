import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Empty,
  Input,
  Pagination,
  Popover,
  Segmented,
  Select,
  Skeleton,
  Switch,
  Tag,
  Tooltip,
} from 'antd'
import { Link, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/api/catalog'
import type { Difficulty, QuestionQuery, QuestionSort } from '@/types/api'
import { AppIcon } from '@/components/AppIcon'
import { DifficultyBadge } from '@/components/DifficultyBadge'
import { ErrorState } from '@/components/ErrorState'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatCount } from '@/lib/format'
import { animateStagger, canAnimate } from '@/lib/gsap'

const PREFS_KEY = 'nowpass.bank.prefs'
const FAVORITES_KEY = 'nowpass.favorites'

interface BankPrefs {
  pageSize: number
  density: 'comfortable' | 'compact'
  showTags: boolean
}

const DEFAULT_PREFS: BankPrefs = { pageSize: 10, density: 'comfortable', showTags: true }

function readPrefs(): BankPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<BankPrefs>
    return {
      pageSize: [10, 20, 50].includes(Number(parsed.pageSize)) ? Number(parsed.pageSize) : 10,
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      showTags: parsed.showTags !== false,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function readFavorites(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is number => typeof item === 'number') : []
  } catch {
    return []
  }
}

export function QuestionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryId = Number(searchParams.get('categoryId')) || null
  const difficulty = (searchParams.get('difficulty') as Difficulty | null) ?? null
  const tag = searchParams.get('tag')
  const sort = (searchParams.get('sort') as QuestionSort | null) ?? 'latest'
  const onlyFavorites = searchParams.get('favorite') === '1'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const keywordFromUrl = searchParams.get('keyword') ?? ''
  const [keyword, setKeyword] = useState(keywordFromUrl)
  const [prefs, setPrefs] = useState<BankPrefs>(readPrefs)
  const [favorites, setFavorites] = useState<number[]>(readFavorites)
  const [customOpen, setCustomOpen] = useState(false)
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 350)
  const listRef = useRef<HTMLOListElement | null>(null)

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

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      // ignore
    }
  }, [prefs])

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
    } catch {
      // ignore
    }
  }, [favorites])

  const baseFilters = useMemo(
    () => ({
      categoryId,
      difficulty,
      tag: tag || null,
      keyword: keywordFromUrl || null,
      sort,
    }),
    [categoryId, difficulty, keywordFromUrl, sort, tag],
  )

  const query = useMemo<QuestionQuery>(
    () => ({ ...baseFilters, page, pageSize: prefs.pageSize }),
    [baseFilters, page, prefs.pageSize],
  )

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories })
  const allTags = useQuery({
    queryKey: ['question-tags'],
    queryFn: () => catalogApi.listQuestions({ page: 1, pageSize: 200, sort: 'title' }),
    staleTime: 5 * 60 * 1000,
  })
  const hotQuestions = useQuery({
    queryKey: ['bank-hot'],
    queryFn: () => catalogApi.listQuestions({ page: 1, pageSize: 3, sort: 'hot' }),
    staleTime: 60 * 1000,
  })
  const questions = useQuery({
    queryKey: ['questions', query],
    queryFn: () => catalogApi.listQuestions(query),
    placeholderData: keepPreviousData,
    enabled: !onlyFavorites,
  })
  const favoriteCandidates = useQuery({
    queryKey: ['favorite-candidates', baseFilters],
    queryFn: () => catalogApi.listQuestions({ ...baseFilters, page: 1, pageSize: 200 }),
    enabled: onlyFavorites,
  })

  const favoriteRows = useMemo(
    () => (favoriteCandidates.data?.rows ?? []).filter((question) => favorites.includes(question.id)),
    [favoriteCandidates.data, favorites],
  )
  const favoritePageRows = favoriteRows.slice((page - 1) * prefs.pageSize, page * prefs.pageSize)
  const rows = onlyFavorites ? favoritePageRows : (questions.data?.rows ?? [])
  const total = onlyFavorites ? favoriteRows.length : (questions.data?.total ?? 0)
  const currentPage = onlyFavorites ? page : (questions.data?.page ?? page)
  const isLoading = onlyFavorites ? favoriteCandidates.isPending : questions.isPending

  const tagOptions = useMemo(() => {
    const values = new Set<string>()
    allTags.data?.rows.forEach((item) => item.tags.forEach((value) => values.add(value)))
    return Array.from(values)
      .sort((left, right) => left.localeCompare(right, 'zh-CN'))
      .map((value) => ({ label: value, value }))
  }, [allTags.data])

  useEffect(() => {
    const container = listRef.current
    if (!container || !rows.length || !canAnimate()) return
    const items = container.querySelectorAll('.question-list__item')
    const tween = animateStagger(items, { duration: 0.3, stagger: 0.045 })
    return () => {
      tween.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyFavorites, page, questions.dataUpdatedAt, favoriteCandidates.dataUpdatedAt, prefs.pageSize])

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

  const toggleFavorite = (id: number) => {
    setFavorites((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const hasFilters = Boolean(categoryId || difficulty || tag || keywordFromUrl || onlyFavorites || sort !== 'latest')
  const activeCategory = categories.data?.find((category) => category.id === categoryId)

  const prefsPanel = (
    <div className="bank-prefs">
      <div className="bank-prefs__row">
        <span>每页题目</span>
        <Select
          value={prefs.pageSize}
          onChange={(value) => {
            setPrefs((current) => ({ ...current, pageSize: value }))
            const next = new URLSearchParams(searchParams)
            next.delete('page')
            setSearchParams(next)
          }}
          options={[10, 20, 50].map((value) => ({ value, label: `${value} 条` }))}
          aria-label="每页题目数量"
        />
      </div>
      <div className="bank-prefs__row">
        <span>列表密度</span>
        <Segmented
          value={prefs.density}
          onChange={(value) =>
            setPrefs((current) => ({ ...current, density: value as BankPrefs['density'] }))
          }
          options={[
            { value: 'comfortable', label: '舒展' },
            { value: 'compact', label: '紧凑' },
          ]}
        />
      </div>
      <div className="bank-prefs__row">
        <span>显示标签</span>
        <Switch
          checked={prefs.showTags}
          onChange={(checked) => setPrefs((current) => ({ ...current, showTags: checked }))}
          aria-label="显示题目标签"
        />
      </div>
      <Button
        size="small"
        type="link"
        onClick={() => {
          setPrefs(DEFAULT_PREFS)
          setCustomOpen(false)
        }}
      >
        恢复默认
      </Button>
    </div>
  )

  return (
    <div className="page-container question-index bank-page">
      <header className="page-heading">
        <p className="eyebrow">QUESTION BANK / 题库</p>
        <div className="page-heading__row">
          <h1>{activeCategory ? activeCategory.name : '面试题库'}</h1>
          <span className="result-count mono">
            {questions.data ? `${formatCount(questions.data.total)} 道题` : '正在翻阅…'}
          </span>
        </div>
        <p className="page-heading__lead">
          {activeCategory
            ? `正在阅读「${activeCategory.name}」相关题目。可以继续加筛选条件，或切换分类。`
            : '共 11 个知识点、20+ 道面试题。用分类、难度、标签与排序缩小范围，收藏与列表密度保存在当前设备。'}
        </p>
        <Link to="/topics" className="text-link">
          按知识点浏览 <AppIcon icon="lucide:arrow-right" size={15} />
        </Link>
      </header>

      {!hasFilters && (hotQuestions.data?.rows.length ?? 0) > 0 && (
        <section className="bank-hot" aria-labelledby="bank-hot-title">
          <div className="home-section__head">
            <div>
              <p className="eyebrow">MOST READ</p>
              <h2 id="bank-hot-title">热门面试题</h2>
            </div>
            <Button type="link" onClick={() => updateFilter('sort', 'hot')}>
              按热度查看全部
            </Button>
          </div>
          <div className="bank-hot__grid">
            {hotQuestions.data?.rows.map((question, index) => (
              <Link
                key={question.id}
                to={`/questions/${question.id}`}
                state={{ from: '/questions' }}
                className="bank-hot__card"
              >
                <span className="mono bank-hot__index">{String(index + 1).padStart(2, '0')}</span>
                <strong>{question.title}</strong>
                <span className="bank-hot__meta">
                  {question.categoryName ?? '未分类'} · {formatCount(question.viewCount)} 次浏览
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="filters bank-filters" aria-label="题目筛选">
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
            showSearch
            value={categoryId ?? undefined}
            onChange={(value) => updateFilter('categoryId', value)}
            placeholder="全部分类"
            aria-label="按分类筛选"
            optionFilterProp="label"
            options={(categories.data ?? []).map((category) => ({ value: category.id, label: category.name }))}
            loading={categories.isPending}
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
          <Select
            value={sort}
            onChange={(value) => updateFilter('sort', value === 'latest' ? null : value)}
            aria-label="题目排序"
            options={[
              { value: 'latest', label: '最新收录' },
              { value: 'hot', label: '最热阅读' },
              { value: 'oldest', label: '最早收录' },
              { value: 'title', label: '标题排序' },
            ]}
          />
        </div>
        <div className="bank-filter-actions">
          <Button
            type={onlyFavorites ? 'primary' : 'default'}
            icon={<AppIcon icon={onlyFavorites ? 'lucide:heart' : 'lucide:heart'} size={16} />}
            onClick={() => updateFilter('favorite', onlyFavorites ? null : '1')}
            aria-pressed={onlyFavorites}
          >
            只看收藏 {favorites.length > 0 ? `(${favorites.length})` : ''}
          </Button>
          <Popover
            open={customOpen}
            onOpenChange={setCustomOpen}
            trigger="click"
            content={prefsPanel}
            placement="bottomRight"
            title="列表自定义"
          >
            <Button icon={<AppIcon icon="lucide:sliders-horizontal" size={16} />}>自定义</Button>
          </Popover>
          {hasFilters && (
            <Button type="link" onClick={clearFilters}>
              清空筛选
            </Button>
          )}
        </div>
      </section>

      {questions.isError || (onlyFavorites && favoriteCandidates.isError) ? (
        <ErrorState
          error={onlyFavorites ? favoriteCandidates.error : questions.error}
          onRetry={() => void (onlyFavorites ? favoriteCandidates.refetch() : questions.refetch())}
        />
      ) : isLoading ? (
        <div className="question-list" aria-busy="true" aria-live="polite">
          {[1, 2, 3, 4, 5].map((key) => (
            <div key={key} className="question-row-skeleton">
              <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1, width: ['30%'] }} />
            </div>
          ))}
        </div>
      ) : rows.length > 0 ? (
        <>
          <ol
            className={prefs.density === 'compact' ? 'question-list question-list--compact' : 'question-list'}
            ref={listRef}
          >
            {rows.map((question, index) => (
              <li key={question.id} className="question-list__item">
                <div className="question-row">
                  <Link
                    to={`/questions/${question.id}`}
                    state={{ from: `/questions${searchParams.toString() ? `?${searchParams.toString()}` : ''}` }}
                    className="question-row__link"
                  >
                    <span className="question-row__index mono">
                      {String((currentPage - 1) * prefs.pageSize + index + 1).padStart(2, '0')}
                    </span>
                    <span className="question-row__body">
                      <span className="question-row__title">{question.title}</span>
                      <span className="question-row__meta">
                        <span>{question.categoryName ?? '未分类'}</span>
                        {prefs.showTags &&
                          question.tags.slice(0, 4).map((item) => (
                            <Tag key={item} bordered={false} className="tag-plain">
                              {item}
                            </Tag>
                          ))}
                        <span className="question-row__views">
                          <AppIcon icon="lucide:eye" size={13} /> {formatCount(question.viewCount)}
                        </span>
                      </span>
                    </span>
                    <DifficultyBadge value={question.difficulty} />
                    <span className="question-row__arrow" aria-hidden="true">
                      <AppIcon icon="lucide:arrow-up-right" size={18} />
                    </span>
                  </Link>
                  <Tooltip title={favorites.includes(question.id) ? '取消收藏' : '收藏这道题'}>
                    <button
                      type="button"
                      className={
                        favorites.includes(question.id) ? 'favorite-button is-active' : 'favorite-button'
                      }
                      onClick={() => toggleFavorite(question.id)}
                      aria-label={favorites.includes(question.id) ? `取消收藏：${question.title}` : `收藏：${question.title}`}
                      aria-pressed={favorites.includes(question.id)}
                    >
                      <AppIcon
                        icon={favorites.includes(question.id) ? 'lucide:heart' : 'lucide:heart'}
                        size={17}
                      />
                    </button>
                  </Tooltip>
                </div>
              </li>
            ))}
          </ol>
          <div className="pagination-row">
            <Pagination
              current={currentPage}
              pageSize={prefs.pageSize}
              total={total}
              showSizeChanger={false}
              hideOnSinglePage={total <= prefs.pageSize}
              onChange={(nextPage) => {
                const next = new URLSearchParams(searchParams)
                if (nextPage <= 1) next.delete('page')
                else next.set('page', String(nextPage))
                setSearchParams(next)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              showTotal={(count) => `共 ${count} 道题`}
            />
          </div>
        </>
      ) : (
        <div className="empty-panel">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              onlyFavorites
                ? '还没有收藏题目。点击题目右侧的心形按钮，把想复习的题收进来。'
                : hasFilters
                  ? '这个筛选组合下暂时没有题目。'
                  : '题库还是空的，等管理员放题目进来。'
            }
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
