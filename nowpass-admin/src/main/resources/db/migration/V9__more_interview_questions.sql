-- 扩充题库：新增 10 道原创面试题。
-- 说明：题目和答案按公开常见考点重新撰写，不复制第三方站点的原文。
-- 覆盖当前题量较少的分类，避免与已有题目重复。

insert into question (category_id, difficulty, title, content_md, answer_md, options, answer_key, tags)
values
-- Java 基础
((select id from question_category where name = 'Java 基础'), 'medium',
 'Java 泛型擦除会带来哪些限制？',
 $md$请解释 Java 泛型擦除的含义，并说明它对运行时类型判断、创建对象和方法重载带来的限制。$md$,
 $md$Java 泛型主要在编译期做类型检查，编译后类型参数会被擦除为原始类型或上界，因此运行时通常拿不到 `List<String>` 中的 `String`。由此不能 `new T()`、不能 `new T[]`、不能用 `instanceof List<String>` 判断泛型实参，也不能仅靠泛型参数不同来重载方法。框架需要保留泛型信息时，可以通过字段、方法签名、父类或接口的 `ParameterizedType` 读取，或使用 TypeToken 等技巧；但对象本身仍不携带泛型实参。擦除还意味着基本类型不能直接作为类型参数，需要装箱。$md$,
 null, null, array['java','generics','type-erasure']),

((select id from question_category where name = 'Java 基础'), 'easy',
 'Java 的受检异常和运行时异常应该怎么选？',
 $md$请说明 Java 异常体系的层次，并给出受检异常、运行时异常和 Error 的使用边界。$md$,
 $md$`Throwable` 下分 `Error` 和 `Exception`；`Error` 表示 JVM 级严重问题，通常不应捕获。`Exception` 中，受检异常要求调用方显式处理，适合调用方可以恢复且必须负责的外部故障；运行时异常不强制捕获，适合参数错误、状态错误等编程问题。不要为了省事把所有异常都包成 `RuntimeException`，也不要捕获后静默吞掉；跨层转换时应保留 cause。自定义异常要提供有意义的类型和信息，资源释放优先用 try-with-resources。Spring 声明式事务默认只对运行时异常回滚，这也是选择异常类型时要考虑的因素。$md$,
 null, null, array['java','exception','error-handling']),

-- JVM
((select id from question_category where name = 'JVM'), 'medium',
 'JVM 类加载过程与双亲委派机制',
 $md$请描述类加载的加载、链接、初始化阶段，并解释双亲委派的作用和它被打破的常见场景。$md$,
 $md$类加载分为加载、链接和初始化；链接又包含验证、准备、解析。加载阶段把字节码读入并生成 Class 对象，准备阶段为静态变量分配内存并设零值，初始化阶段执行 `<clinit>`。双亲委派让类加载请求先交给父加载器，避免核心类被同名类替换，也避免重复加载；类身份由“加载器 + 全限定名”共同决定。SPI、线程上下文类加载器、Tomcat 的 Web 应用隔离、OSGi 等场景会打破严格双亲委派，但通常仍保留核心类优先的安全边界。$md$,
 null, null, array['jvm','classloader','parent-delegation']),

-- 数据库
((select id from question_category where name = '数据库'), 'medium',
 'MySQL 索引失效的常见场景有哪些？',
 $md$请列举 MySQL 中常见的索引失效场景，并说明为什么要用 EXPLAIN 而不是死记规则。$md$,
 $md$常见场景包括：在索引列上做函数、运算或隐式类型转换；`LIKE` 以 `%` 开头；复合索引不满足最左前缀；`OR` 连接了未建索引的列；范围条件之后再使用后续索引列；优化器估算回表成本过高而选择全表扫描；统计信息过期或数据分布极端。`!=`、`NOT IN`、`IS NULL` 是否失效取决于数据分布和版本，不能一概而论。应结合 `EXPLAIN`、实际数据量、回表成本和慢查询日志判断，并通过联合索引、覆盖索引或改写 SQL 解决。$md$,
 null, null, array['mysql','index','explain','sql']),

((select id from question_category where name = '数据库'), 'hard',
 '分库分表后分页、事务和全局 ID 怎么处理？',
 $md$订单表按用户 ID 分库分表后，跨分页、跨分片事务和唯一 ID 分别应该如何设计？$md$,
 $md$分页要避免无界深分页：按分片查询后在内存归并，或使用游标和延迟关联；跨分片 `count` 和排序成本高，需限制范围或做汇总表。跨分片事务优先避免，能按同一分片键完成就别拆；必须跨片时用本地消息表、Saga 或 TCC 做最终一致，并保证幂等和补偿。全局 ID 可用雪花算法、号段模式或数据库序列，要求趋势递增、唯一且尽量短；分片键一旦选错，后续扩容和跨片查询都会很痛。$md$,
 null, null, array['mysql','sharding','distributed-id','transaction']),

-- 计算机网络
((select id from question_category where name = '计算机网络'), 'medium',
 'HTTP 强缓存和协商缓存如何配合？',
 $md$请说明 Cache-Control、ETag、Last-Modified 的作用，以及浏览器在什么情况下返回 200 或 304。$md$,
 $md$强缓存由 `Cache-Control` 的 `max-age`、`s-maxage`、`immutable` 或 `Expires` 控制，命中时浏览器直接使用本地副本，不发请求。强缓存过期后进入协商缓存：浏览器带 `If-None-Match` 或 `If-Modified-Since`，服务端比较 `ETag` 或 `Last-Modified`，未变化返回 304，只更新缓存元数据；变化则返回 200 和新内容。静态资源适合长 `max-age` 加文件名哈希，HTML 和接口通常用 `no-cache` 或短缓存；带用户隐私的响应要加 `private` 或 `no-store`，CDN 还要区分 `s-maxage` 和 `stale-while-revalidate`。$md$,
 null, null, array['http','cache','etag','cdn']),

-- Kotlin
((select id from question_category where name = 'Kotlin'), 'medium',
 'Kotlin 挂起函数和阻塞线程有什么区别？',
 $md$suspend 函数是否一定会切换线程？它和 Thread.sleep、阻塞 IO 的区别是什么？$md$,
 $md$`suspend` 是编译期标记，函数可能挂起并在之后恢复，但不等于自动切线程；是否切线程由 dispatcher 决定。挂起时协程保存 continuation 并让出线程，线程可以去执行别的任务；`Thread.sleep` 或阻塞 IO 会占住当前线程。网络、文件等等待型阻塞应放到 IO dispatcher 或改用非阻塞客户端，CPU 密集任务用 Default 或自定义调度器。协程还依赖结构化并发管理作用域、取消和异常传播；`runBlocking` 只适合桥接阻塞入口，不应在业务代码里滥用。$md$,
 null, null, array['kotlin','coroutine','suspend','concurrency']),

-- Spring
((select id from question_category where name = 'Spring'), 'medium',
 'Spring 声明式事务为什么会失效？',
 $md$请说明 @Transactional 失效的常见原因，并给出排查和修复思路。$md$,
 $md$常见原因：同类内部 self-invocation 绕过代理；方法不是 public、类是 final 或对象不是 Spring Bean；异常被 catch 后没有继续抛出；默认只对 `RuntimeException` 和 `Error` 回滚，受检异常需要 `rollbackFor`；异步线程、`new Thread` 或 `@Async` 不在原事务上下文；数据源或事务管理器不匹配；传播行为设置不当；只读事务里执行写操作。排查先确认调用是否经过代理、事务管理器是否生效、异常类型和传播行为，再决定拆方法、注入自身代理、调整 `rollbackFor` 或改用编程式事务。$md$,
 null, null, array['spring','transaction','aop','proxy']),

-- 并发编程
((select id from question_category where name = '并发编程'), 'medium',
 'CAS 的 ABA 问题是什么？如何解决？',
 $md$请解释 CAS 的原子性来源、ABA 问题，以及高并发下自旋 CAS 的代价。$md$,
 $md$CAS 比较内存当前值和期望值，相等才写新值，CPU 通过原子指令保证比较与写入不可分割，Java 中由 `AtomicInteger`、`AtomicReference` 等封装。ABA 是值从 A 改成 B 又改回 A，CAS 只看到最终值仍为 A，可能误判没有被修改；可用版本号或时间戳（`AtomicStampedReference`）或引用对象整体替换解决。高并发下 CAS 失败会自旋，浪费 CPU；竞争激烈时可退化为锁或使用 `LongAdder` 等分段累加结构。CAS 还需要配合 volatile 保证可见性。$md$,
 null, null, array['java','concurrency','cas','aba']),

-- Java 基础（引用）
((select id from question_category where name = 'Java 基础'), 'medium',
 'Java 的强、软、弱、虚引用分别适合什么场景？',
 $md$请说明四种引用与 GC 可达性的关系，并各举一个典型用途。$md$,
 $md$强引用是普通对象引用，只要可达就不会被回收。软引用在内存不足时可能被回收，适合内存敏感缓存，但不能保证缓存命中。弱引用只要发生 GC 就可能被回收，常用于 `WeakHashMap`、`ThreadLocal` 的 key 或关联元数据，避免强引用导致泄漏。虚引用不能单独取得对象，主要用于对象被回收前收到通知，典型是 `DirectByteBuffer` 的 Cleaner 释放堆外内存。引用队列要和引用对象配合使用；不要用软引用替代合理的缓存淘汰策略。$md$,
 null, null, array['java','reference','gc','memory']);
