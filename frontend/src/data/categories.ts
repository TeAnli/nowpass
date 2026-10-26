export interface CategoryMeta {
  icon: string
  description: string
  routeHint: string
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  'Java 基础': {
    icon: 'lucide:coffee',
    description: '语法、集合、对象模型与常见陷阱',
    routeHint: '从语言地基开始',
  },
  JVM: {
    icon: 'lucide:cpu',
    description: '内存结构、GC、类加载与性能诊断',
    routeHint: '理解程序真正怎么跑',
  },
  数据库: {
    icon: 'lucide:database',
    description: 'SQL、索引、事务与 PostgreSQL 实践',
    routeHint: '把数据放稳',
  },
  计算机网络: {
    icon: 'lucide:network',
    description: 'TCP/IP、HTTP、DNS 与网络排障',
    routeHint: '看清请求走过的路',
  },
  Kotlin: {
    icon: 'lucide:code-xml',
    description: '空安全、扩展、协程与 Java 互操作',
    routeHint: '写出更 Kotlin 的代码',
  },
  Spring: {
    icon: 'lucide:leaf',
    description: 'IoC、AOP、事务、Spring Boot 工程化',
    routeHint: '把框架用明白',
  },
}

const FALLBACK_ICONS = ['lucide:layers', 'lucide:book-marked', 'lucide:sparkles', 'lucide:compass']

export function categoryMeta(name: string, index: number): CategoryMeta {
  return (
    CATEGORY_META[name] ?? {
      icon: FALLBACK_ICONS[index % FALLBACK_ICONS.length],
      description: '按知识点整理的面试题集合',
      routeHint: '进入这个主题',
    }
  )
}
