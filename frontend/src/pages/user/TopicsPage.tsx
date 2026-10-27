import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/AppIcon'
import { catalogApi } from '@/api/catalog'
import { categoryMeta } from '@/data/categories'
import { formatCount } from '@/lib/format'

export function TopicsPage() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories })
  const totalQuestions = (categories.data ?? []).reduce((sum, category) => sum + category.questionCount, 0)

  return (
    <div className="page-container topics-page">
      <header className="topics-header">
        <div>
          <p className="eyebrow">KNOWLEDGE POINTS / 知识标签</p>
          <h1>先选一个知识标签，<br />再进入题目列表。</h1>
          <p className="page-heading__lead">
            知识标签只负责导航。进入某个标签后，题目筛选、收藏和列表设置都在题库页面里完成。
          </p>
        </div>
        <div className="topics-summary">
          <div><strong className="mono">{formatCount(categories.data?.length ?? 0)}</strong><span>知识标签</span></div>
          <div><strong className="mono">{formatCount(totalQuestions)}</strong><span>道面试题</span></div>
          <Link className="hero-action hero-action--primary" to="/questions">
            浏览全部题目 <AppIcon icon="lucide:arrow-right" size={16} />
          </Link>
        </div>
      </header>

      <div className="knowledge-grid topics-grid">
        {(categories.data ?? []).map((category, index) => {
          const meta = categoryMeta(category.name, index)
          return (
            <Link className="knowledge-card topics-card" key={category.id} to={`/questions?categoryId=${category.id}`}>
              <span className="knowledge-card__icon topics-card__icon">
                <AppIcon icon={category.icon || meta.icon} size={26} />
              </span>
              <div className="knowledge-card__body">
                <h3>{category.name}</h3>
                <p>{meta.description}</p>
              </div>
              <div className="knowledge-card__foot">
                <span>{category.questionCount} 道题</span>
                <span className="knowledge-card__hint">{meta.routeHint}</span>
                <AppIcon icon="lucide:arrow-right" size={16} />
              </div>
            </Link>
          )
        })}
      </div>

      {categories.isPending && <p className="muted">正在读取知识标签…</p>}
      {categories.isError && <p className="muted">知识标签加载失败，请稍后刷新。</p>}
    </div>
  )
}
