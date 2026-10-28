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
      <section className="home-masthead">
        <div className="home-masthead__copy">
          <p className="eyebrow">NOWPASS / 面试题库</p>
          <h1>
            把每道题，
            <br />
            读成自己的判断。
          </h1>
          <p className="home-masthead__lead">
            {user?.nickname ? `${user.nickname}，` : ''}
            {formatCount(totalQuestions)} 道题，{categories.data?.length ?? 0} 个知识点。按主题读题，用自己的话回答，再对照答案。
          </p>
          <div className="home-masthead__actions">
            <Link to="/questions" className="hero-action hero-action--primary">
              开始刷题 <AppIcon icon="lucide:arrow-right" size={16} />
            </Link>
            <Link to="/videos" className="hero-action">
              看视频讲解 <AppIcon icon="lucide:clapperboard" size={16} />
            </Link>
          </div>
        </div>

        <aside className="home-brief" aria-label="题库概览">
          <div className="home-brief__head">
            <span className="eyebrow">AT A GLANCE</span>
            <span className="mono">INDEX / 01</span>
          </div>
          <div className="home-stats">
            <div><strong className="mono">{formatCount(totalQuestions)}</strong><span>道题</span></div>
            <div><strong className="mono">{formatCount(categories.data?.length ?? 0)}</strong><span>知识点</span></div>
            <div><strong className="mono">{formatCount(hot.data?.total ?? 0)}</strong><span>热门浏览</span></div>
          </div>
          <div className="home-brief__links">
            <Link to="/interview"><span><AppIcon icon="lucide:bot" size={15} /> AI 面试</span><AppIcon icon="lucide:arrow-up-right" size={14} /></Link>
            <Link to="/roadmap"><span><AppIcon icon="lucide:route" size={15} /> 刷题路线</span><AppIcon icon="lucide:arrow-up-right" size={14} /></Link>
          </div>
        </aside>
      </section>

      <section className="home-section" aria-labelledby="knowledge-title">
        <div className="home-section__head">
          <div>
            <p className="eyebrow">KNOWLEDGE INDEX</p>
            <h2 id="knowledge-title">按知识点读</h2>
          </div>
          <Link to="/topics" className="home-section__link">
            查看全部 <AppIcon icon="lucide:arrow-up-right" size={14} />
          </Link>
        </div>
        <div className="topic-index">
          {(categories.data ?? []).map((category, index) => {
            const meta = categoryMeta(category.name, index)
            return (
              <Link
                className="topic-row"
                key={category.id}
                to={`/questions?categoryId=${category.id}`}
              >
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

      <section className="home-section home-section--split" aria-labelledby="hot-title">
        <div className="hot-panel">
          <div className="home-section__head">
            <div>
              <p className="eyebrow">MOST READ</p>
              <h2 id="hot-title">最近在读</h2>
            </div>
            <AppIcon icon="lucide:flame" size={18} className="hot-panel__flame" />
          </div>
          <ol className="hot-list">
            {(hot.data?.rows ?? []).map((question, index) => (
              <li key={question.id}>
                <Link to={`/questions/${question.id}`} state={{ from: '/' }} className="hot-list__item">
                  <span className="hot-list__index mono">{String(index + 1).padStart(2, '0')}</span>
                  <span className="hot-list__title">{question.title}</span>
                  <span className="hot-list__meta">{question.categoryName ?? '未分类'}</span>
                  <AppIcon icon="lucide:arrow-up-right" size={14} />
                </Link>
              </li>
            ))}
          </ol>
          {hot.isPending && <p className="muted">正在读取最近热门题目…</p>}
        </div>

        <div className="home-route">
          <div className="home-route__head">
            <span className="eyebrow">A ROUTE, NOT A PILE</span>
            <AppIcon icon="lucide:route" size={20} />
          </div>
          <h2>不知道从哪开始？</h2>
          <p>按「语言基础 → 运行时 → 数据与网络 → 框架与云原生 → 分布式与安全 → 模拟面试」推进。</p>
          <Link to="/roadmap" className="text-link">
            打开刷题路线 <AppIcon icon="lucide:arrow-right" size={14} />
          </Link>
        </div>
      </section>
    </div>
  )
}
