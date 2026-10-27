import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/AppIcon'
import { catalogApi } from '@/api/catalog'
import { categoryMeta } from '@/data/categories'
import { formatCount } from '@/lib/format'
import { useAuthStore } from '@/store/auth'

export function HomePage() {
  const user = useAuthStore((state) => state.user)
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories })
  const hot = useQuery({
    queryKey: ['home-hot'],
    queryFn: () => catalogApi.listQuestions({ page: 1, pageSize: 4, sort: 'hot' }),
  })
  const totalQuestions = (categories.data ?? []).reduce((sum, category) => sum + category.questionCount, 0)

  return (
    <div className="page-container home-page">
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">NOWPASS / INTERVIEW READING ROOM</p>
          <h1>
            把面试题，
            <br />
            读成自己的知识地图。
          </h1>
          <p className="home-hero__lead">
            {user?.nickname ? `${user.nickname}，` : ''}不用刷数量。先选一个知识点，把一个问题想透，再翻开答案。
          </p>
          <div className="home-hero__actions">
            <Link to="/questions" className="hero-action hero-action--primary">
              开始刷题 <AppIcon icon="lucide:arrow-right" size={17} />
            </Link>
            <Link to="/roadmap" className="hero-action">
              查看刷题路线 <AppIcon icon="lucide:route" size={17} />
            </Link>
          </div>
        </div>
        <aside className="home-hero__note" aria-label="今日提示">
          <span className="eyebrow">TODAY'S NOTE</span>
          <p className="home-hero__quote">“先用自己的话说一遍，再对照标准答案。”</p>
          <div className="home-hero__stats">
            <div>
              <strong className="mono">{formatCount(totalQuestions)}</strong>
              <span>道题</span>
            </div>
            <div>
              <strong className="mono">{formatCount(categories.data?.length ?? 0)}</strong>
              <span>个知识点</span>
            </div>
            <div>
              <strong className="mono">{formatCount(hot.data?.rows.length ?? 0)}</strong>
              <span>道热门题</span>
            </div>
          </div>
        </aside>
      </section>

      <section className="home-section" aria-labelledby="knowledge-title">
        <div className="home-section__head">
          <div>
            <p className="eyebrow">KNOWLEDGE MAP</p>
            <h2 id="knowledge-title">从知识点开始</h2>
          </div>
          <Link to="/topics" className="home-section__link">
            全部知识点 <AppIcon icon="lucide:arrow-up-right" size={15} />
          </Link>
        </div>
        <div className="knowledge-grid">
          {(categories.data ?? []).map((category, index) => {
            const meta = categoryMeta(category.name, index)
            return (
              <Link
                className="knowledge-card"
                data-index={index}
                key={category.id}
                to={`/questions?categoryId=${category.id}`}
              >
                <span className="knowledge-card__icon">
                  <AppIcon icon={category.icon || meta.icon} size={22} />
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
      </section>

      <section className="home-section home-section--split" aria-labelledby="hot-title">
        <div className="hot-panel">
          <div className="home-section__head">
            <div>
              <p className="eyebrow">MOST READ</p>
              <h2 id="hot-title">热门面试题</h2>
            </div>
            <AppIcon icon="lucide:flame" size={22} className="hot-panel__flame" />
          </div>
          <ol className="hot-list">
            {(hot.data?.rows ?? []).map((question, index) => (
              <li key={question.id}>
                <Link to={`/questions/${question.id}`} state={{ from: '/' }} className="hot-list__item">
                  <span className="hot-list__index mono">{String(index + 1).padStart(2, '0')}</span>
                  <span className="hot-list__title">{question.title}</span>
                  <span className="hot-list__meta">{question.categoryName ?? '未分类'}</span>
                  <AppIcon icon="lucide:arrow-up-right" size={15} />
                </Link>
              </li>
            ))}
          </ol>
          {hot.isPending && <p className="muted">正在挑选最近被翻阅最多的题目…</p>}
        </div>

        <div className="roadmap-teaser">
          <span className="roadmap-teaser__icon"><AppIcon icon="lucide:route" size={24} /></span>
          <p className="eyebrow">A ROUTE, NOT A PILE</p>
          <h2>不知道从哪开始？</h2>
          <p>按「语言基础 → 运行时 → 数据与网络 → 框架 → 模拟面试」五站推进，每一站只读一小组题。</p>
          <Link to="/roadmap" className="text-link">
            打开刷题路线 <AppIcon icon="lucide:arrow-right" size={15} />
          </Link>
        </div>
      </section>
    </div>
  )
}
