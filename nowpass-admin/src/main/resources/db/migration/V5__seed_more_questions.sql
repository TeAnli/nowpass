-- 扩展知识点与示例题，覆盖并发、缓存、消息队列、设计模式与操作系统。

insert into question_category (name, sort, icon)
values ('并发编程', 70, 'logos:java'),
       ('Redis', 80, 'logos:redis'),
       ('消息队列', 90, 'logos:rabbitmq-icon'),
       ('设计模式', 100, 'lucide:shapes'),
       ('操作系统', 110, 'lucide:monitor-cog');

insert into question (category_id, difficulty, title, content_md, answer_md, options, answer_key, tags)
values
((select id from question_category where name = '并发编程'),
 'medium',
 'volatile 能保证原子性吗？它到底保证了什么？',
 $md$很多资料说 `volatile` 可以“保证可见性”，那它是否也能保证 `i++` 的原子性？$md$,
 $md$不能。`volatile` 只保证**可见性**与**禁止指令重排**，不保证复合操作的原子性。`i++` 是读取、加一、写回三个步骤，两个线程可能同时读到旧值后各自写回，结果丢失更新。需要原子性时应使用 `AtomicInteger`、锁或把操作收敛到单线程；`volatile` 适合“一个线程写、多个线程读”的状态标记或安全发布。$md$,
 null, null, array['java','concurrency','volatile','memory-model']),

((select id from question_category where name = '并发编程'),
 'hard',
 '线程池的核心参数如何配合？队列满了以后会发生什么？',
 $md$请说明 `ThreadPoolExecutor` 的核心参数关系，以及任务提交后线程池的完整处理流程。$md$,
 $md$关键参数是 `corePoolSize`、`maximumPoolSize`、`keepAliveTime`、`workQueue` 与 `RejectedExecutionHandler`。流程是：核心线程未满先建核心线程；核心线程满了入队；队列满了才扩容到最大线程数；仍满则触发拒绝策略。常见坑是把无界队列和最大线程数一起使用，导致 `maximumPoolSize` 永远不会生效，任务无限堆积。生产上要结合任务类型选择有界队列、合理的拒绝策略，并为线程池命名和监控。$md$,
 null, null, array['java','concurrency','thread-pool','backpressure']),

((select id from question_category where name = 'Redis'),
 'medium',
 'Redis 单线程为什么还能这么快？',
 $md$Redis 常被称为单线程模型，它是如何支撑高并发的？$md$,
 $md$Redis 的网络 I/O 与命令执行主要走单线程，避免了多线程锁竞争和上下文切换；数据在内存中，命令执行路径短；核心数据结构针对场景做过优化；并使用 I/O 多路复用处理大量连接。需要注意：单线程不等于没有阻塞风险，慢查询、大 key、复杂 Lua、`keys *`、大集合删除都会卡住主线程。Redis 6 之后网络 I/O 可以多线程，但命令执行仍然保持单线程语义。$md$,
 null, null, array['redis','cache','single-thread','io']),

((select id from question_category where name = 'Redis'),
 'medium',
 '缓存穿透、击穿、雪崩分别是什么？如何分别处理？',
 $md$请区分缓存穿透、缓存击穿与缓存雪崩，并说明对应的治理手段。$md$,
 $md$穿透是查询根本不存在的数据，缓存永远不命中，请求全部落到数据库；可用空值缓存、布隆过滤器、参数校验。击穿是某个热点 key 过期瞬间大量并发打穿缓存；可用互斥重建、逻辑过期、热点永不过期。雪崩是大量 key 同时过期或缓存整体不可用；可用过期时间加随机抖动、分批预热、多级缓存与限流降级。三者的共同点是保护数据库，而不是只给 Redis 加机器。$md$,
 null, null, array['redis','cache','bloom-filter','availability']),

((select id from question_category where name = '消息队列'),
 'hard',
 '消息队列如何尽量保证消息不丢？',
 $md$从生产者、Broker、消费者三个环节说明消息不丢失需要哪些条件。$md$,
 $md$生产者要开启发送确认并处理失败重试；Broker 要开启持久化、副本同步与合理的刷盘策略；消费者要关闭自动确认，业务处理成功后手动 ack，并做好幂等。还要注意“确认成功但业务失败”与“业务成功但 ack 失败”的边界，通常用本地消息表、事务消息或对账补偿兜底。任何单点配置都不能绝对保证不丢，必须结合业务接受度设计。$md$,
 null, null, array['mq','reliability','idempotency','distributed']),

((select id from question_category where name = '消息队列'),
 'medium',
 '消息重复消费如何保证业务幂等？',
 $md$消息队列通常只能保证至少一次投递，重复消费时应该怎样处理？$md$,
 $md$幂等的核心是让同一业务请求执行一次和执行多次结果一致。常见做法：业务唯一键 + 数据库唯一索引；消费记录表或去重表；状态机校验（只允许从待支付到已支付一次）；Redis `SETNX` 做短期去重，但要注意过期与崩溃恢复；金额、库存等操作使用条件更新而不是“先查再改”。设计时要把幂等键与业务事务绑定，不能只在消费端做内存去重。$md$,
 null, null, array['mq','idempotency','distributed','transaction']),

((select id from question_category where name = '设计模式'),
 'medium',
 '单例模式为什么需要双重检查锁？',
 $md$双重检查锁（DCL）解决什么问题？为什么实例字段通常要加 `volatile`？$md$,
 $md$双重检查锁先判断实例是否为空，避免每次获取实例都加锁；只有在为空时才同步并在锁内再次检查，防止多个线程同时通过第一次判断后重复创建。`instance = new Singleton()` 不是原子操作，可能经历分配内存、初始化对象、赋值引用三个步骤，指令重排会让其他线程看到“引用非空但对象未初始化”的半成品，因此需要 `volatile` 禁止相关重排。现代 Java 更推荐静态内部类或枚举实现单例。$md$,
 null, null, array['design-pattern','singleton','java','concurrency']),

((select id from question_category where name = '设计模式'),
 'easy',
 '策略模式和工厂模式的区别是什么？',
 $md$请说明策略模式与工厂模式分别解决什么问题，以及它们是否可以一起使用。$md$,
 $md$策略模式关注**行为可替换**：把一组算法抽象成统一接口，运行时选择具体策略；工厂模式关注**对象创建**：把创建过程从调用方抽离，隐藏具体实现。两者不冲突，常见组合是工厂负责创建策略实例，上下文负责执行策略。不要在只有一个固定算法时强上策略模式，也不要让工厂承担业务决策。$md$,
 null, null, array['design-pattern','strategy','factory','solid']),

((select id from question_category where name = '操作系统'),
 'medium',
 '进程和线程的区别是什么？协程又解决了什么问题？',
 $md$从资源、调度和切换成本三个角度比较进程、线程与协程。$md$,
 $md$进程是资源分配的基本单位，拥有独立地址空间；线程是 CPU 调度的基本单位，同进程线程共享地址空间但各自有栈和寄存器上下文；协程是用户态调度的轻量执行单元，切换不经过内核，适合大量 I/O 等待场景。进程隔离性最好但切换最重，线程切换需要内核参与，协程切换最轻但需要语言运行时或调度器支持。选择时看隔离性、并发规模和阻塞模型，而不是单纯比较“谁更快”。$md$,
 null, null, array['os','process','thread','coroutine']),

((select id from question_category where name = '数据库'),
 'hard',
 'MVCC 如何实现可重复读？它解决了幻读吗？',
 $md$以 PostgreSQL/InnoDB 为例，说明 MVCC 的版本可见性，以及它和幻读的关系。$md$,
 $md$MVCC 通过保存行的版本信息与事务快照，让不同事务看到各自一致的版本，读不加锁，从而提升并发。InnoDB 的可重复读通常在事务开始时建立一致性视图；PostgreSQL 的 `repeatable read` 使用快照隔离，写冲突会报序列化失败。MVCC 能避免大部分“读到别人未提交/已提交新版本”的问题，但普通快照读仍可能看不到或看到范围变化；幻读要靠间隙锁、谓词锁或序列化隔离级别解决。回答时要区分快照读与当前读。$md$,
 null, null, array['database','mvcc','transaction','isolation']),

((select id from question_category where name = 'Java 基础'),
 'medium',
 'HashMap 的扩容过程是什么？为什么容量通常是 2 的幂？',
 $md$请说明 HashMap 扩容时元素如何迁移，以及容量为 2 的幂带来的好处。$md$,
 $md$扩容时容量翻倍，旧桶中的节点会重新分配到新表：单个节点根据 hash 的高位决定留在原索引或移动到“原索引 + 旧容量”；红黑树节点在拆分后可能退化为链表。容量为 2 的幂时，`(n - 1) & hash` 可以代替取模，分布均匀且计算快，扩容时也只需检查 hash 的一个高位，迁移成本较低。注意加载因子、树化阈值和并发修改都会影响行为，HashMap 本身不是线程安全的。$md$,
 null, null, array['java','collection','hashmap','performance']);
