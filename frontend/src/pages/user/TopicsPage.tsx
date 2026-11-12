import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { QuestionCategory } from '@nowpass/api-contracts'
import { AppIcon } from '@/components/AppIcon'
import { catalogApi } from '@/api/catalog'
import { categoryMeta } from '@/data/categories'
import { formatCount } from '@/lib/format'

interface CategoryGroup {
  name: string
  sort: number
  items: QuestionCategory[]
}

const EMPTY_CATEGORIES: QuestionCategory[] = []

export function TopicsPage() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories })
  const allCategories = categories.data ?? EMPTY_CATEGORIES
  const totalQuestions = allCategories.reduce((sum, category) => sum + category.questionCount, 0)
  const groups = (() => {
    const grouped = new Map<string, CategoryGroup>()
    allCategories.forEach((category) => {
      const name = category.majorCategoryName ?? '未分组'
      const sort = category.majorCategorySort ?? 9999
      const group = grouped.get(name) ?? { name, sort, items: [] }
      group.items.push(category)
      grouped.set(name, group)
    })
    return [...grouped.values()].sort((left, right) => left.sort - right.sort)
  })()

  return (
    <div className="page-container topics-page">
      <header className="topics-header">
        <div>
          <p className="eyebrow">KNOWLEDGE POINTS / 知识标签</p>
          <h1>先选一个知识标签，<br />再进入题目列表。</h1>
          <p className="page-heading__lead">
            知识标签按大类归组。进入某个标签后，题目筛选、收藏和列表设置都在题库页面里完成。
          </p>
        </div>
        <div className="topics-summary">
          <div><strong className="mono">{formatCount(allCategories.length)}</strong><span>知识标签</span></div>
          <div><strong className="mono">{formatCount(groups.length)}</strong><span>个大类</span></div>
          <div><strong className="mono">{formatCount(totalQuestions)}</strong><span>道面试题</span></div>
          <Link className="hero-action hero-action--primary" to="/questions">
            浏览全部题目 <AppIcon icon="lucide:arrow-right" size={16} />
          </Link>
        </div>
      </header>

      {groups.map((group, groupIndex) => (
        <section className="topic-group" key={group.name} aria-labelledby={`topic-group-${groupIndex}`}>
          <div className="topic-group__head">
            <div>
              <p className="eyebrow">MAJOR {String(groupIndex + 1).padStart(2, '0')}</p>
              <h2 id={`topic-group-${groupIndex}`}>{group.name}</h2>
            </div>
            <span className="topic-group__count mono">{group.items.length} 个分类</span>
          </div>
          <div className="topic-index topics-index">
            {group.items.map((category) => {
              const index = allCategories.indexOf(category)
              const meta = categoryMeta(category.name, index)
              return (
                <Link className="topic-row" key={category.id} to={`/questions?categoryId=${category.id}`}>
                  <span className="topic-row__index mono">{String(index + 1).padStart(2, '0')}</span>
                  <span className="topic-row__icon"><AppIcon icon={category.icon || meta.icon} size={18} /></span>
                  <span className="topic-row__body">
                    <strong>{category.name}</strong>
                    <small>{meta.description}</small>
                  </span>
                  <span className="topic-row__count mono">{category.questionCount}</span>
                  <AppIcon icon="lucide:arrow-right" size={14} />
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      {categories.isPending && <p className="muted">正在读取知识标签…</p>}
      {categories.isError && <p className="muted">知识标签加载失败，请稍后刷新。</p>}
    </div>
  )
}
