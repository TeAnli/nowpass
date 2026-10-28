import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppIcon } from '@/components/AppIcon'
import { catalogApi } from '@/api/catalog'
import type { QuestionCategory } from '@/types/api'

const ROADMAP_KEY = 'nowpass.roadmap.done'

interface RoadmapStage {
  id: string
  icon: string
  eyebrow: string
  title: string
  duration: string
  description: string
  categories: string[]
}

const STAGES: RoadmapStage[] = [
  {
    id: 'language',
    icon: 'lucide:coffee',
    eyebrow: 'STAGE 01',
    title: '语言与基础',
    duration: '约 2 天',
    description: '先把 Java 与 Kotlin 的语法、对象模型、集合和空安全过一遍。基础题不追求快，追求说清楚。',
    categories: ['Java 基础', 'Kotlin'],
  },
  {
    id: 'runtime',
    icon: 'lucide:cpu',
    eyebrow: 'STAGE 02',
    title: '运行时与性能',
    duration: '约 2 天',
    description: '理解 JVM 内存结构、类加载与 GC，能解释“为什么会 OOM / 为什么停顿”而不是背名词。',
    categories: ['JVM'],
  },
  {
    id: 'algorithm',
    icon: 'lucide:binary',
    eyebrow: 'STAGE 03',
    title: '数据结构与算法',
    duration: '约 2 天',
    description: '从复杂度、排序、哈希和树结构到动态规划，练习把思路、边界和复杂度一起讲清楚。',
    categories: ['数据结构与算法'],
  },
  {
    id: 'data-network',
    icon: 'lucide:network',
    eyebrow: 'STAGE 04',
    title: '数据与网络',
    duration: '约 2 天',
    description: '把 SQL、索引、事务、TCP/IP 和 HTTP 串起来，能够从一次请求追踪到数据落盘。',
    categories: ['数据库', '计算机网络'],
  },
  {
    id: 'framework',
    icon: 'lucide:boxes',
    eyebrow: 'STAGE 05',
    title: '框架与云原生',
    duration: '约 2 天',
    description: '搞清楚 Spring、微服务与容器化工程实践：哪些问题由框架解决，哪些必须自己设计。',
    categories: ['Spring', '微服务', '容器与云原生'],
  },
  {
    id: 'distributed',
    icon: 'lucide:share-2',
    eyebrow: 'STAGE 06',
    title: '分布式与安全',
    duration: '约 2 天',
    description: '理解分布式一致性、缓存与消息可靠性，同时补上 Web 安全和 Linux 排障视角。',
    categories: ['分布式系统', 'Web 安全', 'Linux'],
  },
  {
    id: 'mock',
    icon: 'lucide:message-circle',
    eyebrow: 'STAGE 07',
    title: '模拟面试',
    duration: '持续进行',
    description: '从热门题里随机抽题，用口述方式作答，再对照答案补上遗漏的关键词和边界条件。',
    categories: [],
  },
]

function readProgress(): string[] {
  try {
    const raw = localStorage.getItem(ROADMAP_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function RoadmapPage() {
  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.listCategories })
  const [done, setDone] = useState<string[]>(readProgress)
  const byName = useMemo(() => {
    const map = new Map<string, QuestionCategory>()
    categories.data?.forEach((category) => map.set(category.name, category))
    return map
  }, [categories.data])
  const completed = STAGES.filter((stage) => done.includes(stage.id)).length
  const percent = Math.round((completed / STAGES.length) * 100)

  useEffect(() => {
    try {
      localStorage.setItem(ROADMAP_KEY, JSON.stringify(done))
    } catch {
      // 忽略隐私模式下的存储失败
    }
  }, [done])

  const toggleStage = (id: string) => {
    setDone((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <div className="page-container roadmap-page">
      <header className="roadmap-header">
        <div>
          <p className="eyebrow">PRACTICE ROUTE / 刷题路线</p>
          <h1>一次只走一站，<br />不要一口气刷完。</h1>
          <p className="page-heading__lead">
            路线把题库拆成七个阶段。完成一站再进入下一站，用“能否讲清楚”而不是“做了多少题”判断是否过关。
          </p>
        </div>
        <div className="roadmap-progress" aria-label={`路线完成度 ${percent}%`}>
          <div className="roadmap-progress__value mono">{percent}%</div>
          <div className="roadmap-progress__bar">
            <span style={{ width: `${percent}%` }} />
          </div>
          <p>{completed} / {STAGES.length} 站已完成</p>
        </div>
      </header>

      <ol className="roadmap-list">
        {STAGES.map((stage, index) => {
          const stageCategories = stage.categories
            .map((name) => byName.get(name))
            .filter((category): category is QuestionCategory => Boolean(category))
          const count = stageCategories.reduce((sum, category) => sum + category.questionCount, 0)
          const target = stageCategories[0]
          const isDone = done.includes(stage.id)
          return (
            <li className={isDone ? 'roadmap-stage is-done' : 'roadmap-stage'} key={stage.id}>
              <div className="roadmap-stage__rail" aria-hidden="true">
                <span className="roadmap-stage__number mono">{String(index + 1).padStart(2, '0')}</span>
                {index < STAGES.length - 1 && <span className="roadmap-stage__line" />}
              </div>
              <div className="roadmap-stage__card">
                <div className="roadmap-stage__head">
                  <span className="roadmap-stage__icon"><AppIcon icon={stage.icon} size={22} /></span>
                  <div>
                    <p className="eyebrow">{stage.eyebrow} · {stage.duration}</p>
                    <h2>{stage.title}</h2>
                  </div>
                  <button
                    type="button"
                    className={isDone ? 'roadmap-check is-done' : 'roadmap-check'}
                    onClick={() => toggleStage(stage.id)}
                    aria-pressed={isDone}
                    aria-label={isDone ? `将${stage.title}标记为未完成` : `将${stage.title}标记为完成`}
                  >
                    <AppIcon icon={isDone ? 'lucide:check' : 'lucide:circle'} size={18} />
                    {isDone ? '已完成' : '标记完成'}
                  </button>
                </div>
                <p className="roadmap-stage__desc">{stage.description}</p>
                <div className="roadmap-stage__foot">
                  <div className="roadmap-stage__tags">
                    {stageCategories.map((category) => (
                      <span key={category.id} className="roadmap-tag">{category.name} · {category.questionCount}</span>
                    ))}
                    {stage.id === 'mock' && <span className="roadmap-tag">热门题随机练</span>}
                    <span className="roadmap-stage__count">{count > 0 ? `${count} 道题` : '从热门题开始'}</span>
                  </div>
                  <Link
                    className="roadmap-stage__link"
                    to={target ? `/questions?categoryId=${target.id}` : '/questions?sort=hot'}
                  >
                    {target ? '进入这一站' : '随机抽题'} <AppIcon icon="lucide:arrow-right" size={16} />
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
