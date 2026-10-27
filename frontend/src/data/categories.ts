export interface CategoryMeta {
  icon: string
  description: string
  routeHint: string
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  'Java 基础': {
    icon: 'logos:java',
    description: '语法、集合、对象模型与常见陷阱',
    routeHint: '从语言地基开始',
  },
  JVM: {
    icon: 'logos:java',
    description: '内存结构、GC、类加载与性能诊断',
    routeHint: '理解程序真正怎么跑',
  },
  数据库: {
    icon: 'logos:postgresql',
    description: 'SQL、索引、事务与 PostgreSQL 实践',
    routeHint: '把数据放稳',
  },
  计算机网络: {
    icon: 'lucide:network',
    description: 'TCP/IP、HTTP、DNS 与网络排障',
    routeHint: '看清请求走过的路',
  },
  Kotlin: {
    icon: 'logos:kotlin-icon',
    description: '空安全、扩展、协程与 Java 互操作',
    routeHint: '写出更 Kotlin 的代码',
  },
  Spring: {
    icon: 'logos:spring-icon',
    description: 'IoC、AOP、事务、Spring Boot 工程化',
    routeHint: '把框架用明白',
  },
  并发编程: {
    icon: 'logos:java',
    description: '线程、锁、内存模型与线程池',
    routeHint: '把并发问题讲清楚',
  },
  Redis: {
    icon: 'logos:redis',
    description: '缓存模型、持久化、热点与一致性',
    routeHint: '从缓存命中率开始',
  },
  消息队列: {
    icon: 'logos:rabbitmq-icon',
    description: '可靠投递、重复消费与削峰填谷',
    routeHint: '理解消息的旅程',
  },
  设计模式: {
    icon: 'lucide:shapes',
    description: '常用模式、适用边界与工程取舍',
    routeHint: '别为了模式而模式',
  },
  操作系统: {
    icon: 'lucide:monitor-cog',
    description: '进程线程、内存、I/O 与调度',
    routeHint: '看清底层的运行方式',
  },
  分布式系统: {
    icon: 'lucide:share-2',
    description: 'CAP、分布式锁、事务与一致性',
    routeHint: '把一致性讲明白',
  },
  微服务: {
    icon: 'lucide:boxes',
    description: '服务拆分、注册发现、配置与灰度',
    routeHint: '理解服务之间的边界',
  },
  数据结构与算法: {
    icon: 'lucide:binary',
    description: '复杂度、排序、动态规划与索引结构',
    routeHint: '把思路和复杂度说清楚',
  },
  容器与云原生: {
    icon: 'logos:docker-icon',
    description: 'Docker、Kubernetes、发布与可观测性',
    routeHint: '从镜像走到集群',
  },
  'Web 安全': {
    icon: 'lucide:shield-check',
    description: 'XSS、CSRF、注入、认证与越权',
    routeHint: '先假设输入不可信',
  },
  Linux: {
    icon: 'lucide:terminal',
    description: '进程线程、I/O 模型、内存与排障',
    routeHint: '回到命令行看现场',
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
