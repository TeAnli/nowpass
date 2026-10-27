import { useEffect, useState } from 'react'
import { Button, Input, Pagination, Select } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/AppIcon'
import { VideoCover } from '@/components/VideoCover'
import { videoApi } from '@/api/videos'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDate } from '@/lib/format'

const PAGE_SIZE = 12

export function VideoListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const categoryId = Number(searchParams.get('categoryId')) || null
  const tag = searchParams.get('tag')
  const keywordFromUrl = searchParams.get('keyword') ?? ''
  const [keyword, setKeyword] = useState(keywordFromUrl)
  const debouncedKeyword = useDebouncedValue(keyword, 350)

  const categories = useQuery({ queryKey: ['video-categories'], queryFn: videoApi.categories })
  const tags = useQuery({ queryKey: ['video-tags'], queryFn: videoApi.tags })
  const videos = useQuery({
    queryKey: ['videos', page, categoryId, tag, debouncedKeyword],
    queryFn: () =>
      videoApi.list({
        page,
        pageSize: PAGE_SIZE,
        categoryId,
        tag,
        keyword: debouncedKeyword || undefined,
      }),
  })

  useEffect(() => {
    if (debouncedKeyword === keywordFromUrl) return
    const next = new URLSearchParams(searchParams)
    if (debouncedKeyword) next.set('keyword', debouncedKeyword)
    else next.delete('keyword')
    next.delete('page')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword])

  const updateFilter = (key: string, value: string | number | null | undefined) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === undefined || value === '') next.delete(key)
    else next.set(key, String(value))
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  const rows = videos.data?.rows ?? []
  const total = videos.data?.total ?? 0
  const hasFilters = Boolean(categoryId || tag || debouncedKeyword)

  return (
    <div className="page-container videos-page">
      <header className="videos-heading">
        <div>
          <p className="eyebrow">VIDEO NOTES / 视频讲解</p>
          <h1>听不懂的地方，<br />换一种方式讲。</h1>
          <p className="page-heading__lead">
            面试题的文字答案之外，这里收录更完整的技术讲解。按分类和标签找到一段视频，把一个问题真正讲透。
          </p>
        </div>
        <div className="videos-heading__meta">
          <div><strong className="mono">{total}</strong><span>段视频讲解</span></div>
          <div><strong className="mono">{categories.data?.length ?? 0}</strong><span>个视频分类</span></div>
          <div><strong className="mono">{tags.data?.length ?? 0}</strong><span>个标签</span></div>
        </div>
      </header>

      <section className="video-filters" aria-label="视频筛选">
        <Input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          allowClear
          prefix={<AppIcon icon="lucide:search" size={17} />}
          placeholder="搜索视频标题…"
          aria-label="搜索视频标题"
          className="video-filter-search"
        />
        <Select
          allowClear
          value={categoryId ?? undefined}
          onChange={(value) => updateFilter('categoryId', value)}
          placeholder="全部分类"
          aria-label="按视频分类筛选"
          options={(categories.data ?? []).map((category) => ({ value: category.id, label: category.name }))}
        />
        <Select
          allowClear
          showSearch
          value={tag ?? undefined}
          onChange={(value) => updateFilter('tag', value)}
          placeholder="全部标签"
          aria-label="按视频标签筛选"
          optionFilterProp="label"
          options={(tags.data ?? []).map((value) => ({ value, label: value }))}
        />
        {hasFilters && (
          <Button type="link" onClick={() => { setKeyword(''); setSearchParams(new URLSearchParams()) }}>
            清除筛选
          </Button>
        )}
      </section>

      {videos.isPending && <p className="muted videos-state">正在读取视频讲解…</p>}
      {videos.isError && <p className="muted videos-state">视频列表加载失败，请稍后刷新。</p>}
      {!videos.isPending && !videos.isError && rows.length === 0 && (
        <div className="videos-empty">
          <span><AppIcon icon="lucide:clapperboard" size={26} /></span>
          <h2>还没有视频讲解</h2>
          <p>{hasFilters ? '换个筛选条件试试。' : '管理员发布视频后，会在这里出现。'}</p>
        </div>
      )}

      <div className="video-grid">
        {rows.map((video) => (
          <Link className="video-card" to={`/videos/${video.id}`} key={video.id}>
            <VideoCover url={video.coverUrl} title={video.title} durationSeconds={video.durationSeconds} />
            <div className="video-card__body">
              <div className="video-card__meta">
                <span>{video.categoryName ?? '未分类'}</span>
                <span>{formatDate(video.publishedAt)}</span>
              </div>
              <h2>{video.title}</h2>
              <div className="video-card__foot">
                <span>{video.speaker || 'NowPass 讲师'}</span>
                <AppIcon icon="lucide:arrow-up-right" size={16} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {total > PAGE_SIZE && (
        <Pagination
          className="videos-pagination"
          current={page}
          pageSize={PAGE_SIZE}
          total={total}
          showSizeChanger={false}
          onChange={(nextPage) => updateFilter('page', nextPage)}
          showTotal={(count) => `共 ${count} 段视频`}
        />
      )}
    </div>
  )
}
