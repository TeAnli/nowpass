-- 补齐题目：保证每个分类至少 2 道题。
-- 20 个空分类各补 2 道，操作系统补 1 道，共 41 道原创题。

insert into question (category_id, difficulty, title, content_md, answer_md, options, answer_key, tags)
values
-- Java 集合
((select id from question_category where name = 'Java 集合'), 'medium',
 'ArrayList 和 LinkedList 应该怎么选？',
 $md$请从随机访问、插入删除、内存布局和实际工程使用角度比较 ArrayList 与 LinkedList。$md$,
 $md$ArrayList 基于动态数组，随机访问 O(1)，尾部追加均摊 O(1)，中间插入删除需要搬移元素；内存连续、缓存友好。LinkedList 基于双向链表，已知节点时插入删除 O(1)，但定位要 O(n)，每个节点有前后指针开销，缓存局部性差。多数业务场景 ArrayList 更快，需要双端队列时优先 ArrayDeque；不要因为“链表插入快”就默认选 LinkedList。$md$,
 null, null, array['java','collection','arraylist','linkedlist']),

((select id from question_category where name = 'Java 集合'), 'hard',
 'ConcurrentHashMap 如何保证线程安全？',
 $md$请说明 JDK 8 中 ConcurrentHashMap 的并发控制方式，以及它的“弱一致性”意味着什么。$md$,
 $md$JDK 8 去掉了 Segment，使用 CAS 初始化桶、槽位为空时 CAS 插入，槽位非空时对桶头节点加 synchronized，锁粒度更小；扩容支持多线程协助迁移。size 使用类似 LongAdder 的分段计数。迭代器和 size 是弱一致的：并发修改时可能看到旧值，但不抛 ConcurrentModificationException。它保证单次操作原子和可见性，不保证多个操作组合起来是原子的；复合操作仍需 compute/merge 或额外同步。$md$,
 null, null, array['java','concurrenthashmap','concurrency','collection']),

-- 后端场景
((select id from question_category where name = '后端场景'), 'medium',
 '库存超卖应该怎么防？',
 $md$请说明数据库扣减、缓存预扣、幂等和补偿分别解决什么问题。$md$,
 $md$核心是把“判断库存足够”和“扣减库存”合成一个原子操作，例如 update stock set qty = qty - ? where id = ? and qty >= ?，根据影响行数判断成功。高并发可先在 Redis 预扣，再用消息异步落库并补偿失败；订单要按业务幂等键唯一，防止重复扣减。分布式锁能降低并发冲突但不是强一致方案。还要处理支付失败、取消订单和超时回补，避免少卖或重复回补。$md$,
 null, null, array['backend','scenario','inventory','concurrency']),

((select id from question_category where name = '后端场景'), 'hard',
 '订单超时关闭怎么做？',
 $md$请比较定时扫描、延迟消息和 Redis 过期事件，并说明如何避免与支付并发冲突。$md$,
 $md$定时扫描实现简单但有延迟和数据库压力；延迟消息（RocketMQ/ RabbitMQ 延迟插件）更准时，但要保证消息不丢和幂等；Redis ZSet/过期事件适合轻量场景，但过期通知不保证可靠。关闭订单时必须做状态机条件更新，例如只有待支付才能关闭，并与支付回调竞争同一行；关闭成功后释放库存和优惠券。还要有兜底扫描，防止消息丢失导致订单永久挂起。$md$,
 null, null, array['backend','scenario','order','delay-queue']),

-- Go
((select id from question_category where name = 'Go'), 'medium',
 'goroutine 和操作系统线程有什么区别？',
 $md$请说明 goroutine 的调度方式、栈内存和阻塞行为。$md$,
 $md$goroutine 是 Go 运行时调度的用户态轻量执行单元，初始栈很小、按需增长，创建和切换成本远低于线程；Go 使用 G-M-P 模型把大量 goroutine 复用到少量线程上。goroutine 遇到 channel、网络等等待时会协作让出，阻塞系统调用则由运行时调度其他任务。它不是“无限免费”：大量阻塞 goroutine、泄漏或 CPU 密集任务仍会拖垮程序。GOMAXPROCS 控制可并行执行用户代码的 P 数量。$md$,
 null, null, array['go','goroutine','scheduler','concurrency']),

((select id from question_category where name = 'Go'), 'medium',
 'Go 的 slice 扩容和底层数组共享是怎么回事？',
 $md$请解释 len、cap、append 的行为，以及切片共享底层数组可能带来的问题。$md$,
 $md$slice 是数组的视图，包含指针、len 和 cap。append 在 cap 足够时复用底层数组，超出时分配新数组并复制；扩容策略随元素大小和版本变化，不能依赖具体倍数。对 slice 再切片会共享底层数组，修改可能影响原 slice；append 也可能覆盖共享区域。函数返回大数组的切片时要注意逃逸和内存保留。需要独立副本时用 copy 或 slices.Clone，并发读写同一底层数组要加同步。$md$,
 null, null, array['go','slice','memory','append']),

-- MyBatis
((select id from question_category where name = 'MyBatis'), 'medium',
 'MyBatis 中 #{} 和美元花括号有什么区别？',
 $md$为什么说美元花括号有 SQL 注入风险？动态表名、排序字段应该怎么处理？$md$,
 $md$`#{}` 会生成 JDBC 占位符并做参数绑定，能防止 SQL 注入，适合绝大多数值；美元花括号是字符串直接拼接，适合表名、列名、排序方向等无法参数化的位置，但必须来自白名单校验，不能直接使用用户输入。动态 SQL 中优先用 `#{}`；确实要拼标识符时，在服务端枚举或正则校验，禁止传入整段 SQL。排序字段也要映射到允许的列名和 ASC/DESC。$md$,
 null, null, array['mybatis','sql-injection','dynamic-sql']),

((select id from question_category where name = 'MyBatis'), 'medium',
 'MyBatis 一级缓存和二级缓存有什么区别？',
 $md$请说明缓存范围、失效时机，以及在线上使用二级缓存的风险。$md$,
 $md$一级缓存是 SqlSession 级别，默认开启，同一次会话中相同查询会复用；执行增删改或关闭会话后失效，事务隔离下可能读到会话内旧数据。二级缓存是 Mapper namespace 级别，跨 SqlSession 共享，需要显式配置并实现可序列化；多表关联、更新其他 namespace 数据时容易脏读，分布式环境更难失效。缓存应只用于读多写少、可接受短暂不一致的数据；很多场景用 Redis 显式缓存更可控。$md$,
 null, null, array['mybatis','cache','sqlsession']),

-- Netty
((select id from question_category where name = 'Netty'), 'medium',
 'Netty 的 Reactor 线程模型是怎样的？',
 $md$请说明 bossGroup、workerGroup、EventLoop 和 ChannelPipeline 的职责。$md$,
 $md$bossGroup 负责 accept 新连接，workerGroup 负责已连接 Channel 的读写事件；每个 Channel 绑定一个 EventLoop，EventLoop 由单线程驱动，串行处理该 Channel 的事件，避免并发竞争。ChannelPipeline 把入站/出站处理器串成链，业务逻辑通常放在自定义 handler 中。耗时或阻塞操作不能直接跑在 EventLoop 上，应提交到业务线程池。理解“一个 Channel 的事件是串行的”是排查 Netty 线程安全问题的关键。$md$,
 null, null, array['netty','reactor','eventloop','pipeline']),

((select id from question_category where name = 'Netty'), 'medium',
 'Netty 如何解决 TCP 粘包和拆包？',
 $md$请列举常见解码方案，并说明长度字段解码器需要注意什么。$md$,
 $md$TCP 是字节流，没有消息边界，一次 read 可能包含半包、粘包或多个包。常见方案有固定长度、分隔符、长度字段和自定义协议；Netty 提供 FixedLengthFrameDecoder、DelimiterBasedFrameDecoder、LengthFieldBasedFrameDecoder 等。长度字段要明确字节序、长度是否包含头、最大帧长度，防止恶意超长包耗尽内存；解码后还要处理半包缓存和连接关闭时的残包。$md$,
 null, null, array['netty','tcp','codec','sticky-packet']),

-- C++
((select id from question_category where name = 'C++'), 'medium',
 'C++ 中指针和引用有什么区别？',
 $md$请从初始化、可空性、重新绑定、内存布局和所有权角度比较指针与引用。$md$,
 $md$引用是已有对象的别名，必须初始化，不能重新绑定，通常不占独立对象空间；指针保存地址，可以为空、可以改指向、支持算术运算。函数参数需要“必须存在且不转移所有权”时用引用，可能为空或需要重新指向时用指针。引用本身不表达所有权，动态资源优先用 unique_ptr/shared_ptr；返回局部变量引用或指向已释放对象的指针都是未定义行为。$md$,
 null, null, array['cpp','pointer','reference','memory']),

((select id from question_category where name = 'C++'), 'hard',
 'C++ 的 RAII 和智能指针解决什么问题？',
 $md$请解释 RAII 的核心思想，以及 unique_ptr、shared_ptr、weak_ptr 的使用边界。$md$,
 $md$RAII 把资源获取绑定到对象构造，把释放绑定到析构，利用栈对象确定性析构避免异常路径泄漏。unique_ptr 表达独占所有权，零额外引用计数开销；shared_ptr 表达共享所有权，但控制块和引用计数有成本，循环引用会泄漏；weak_ptr 观察 shared_ptr 而不增加计数，用来打破循环。优先 make_unique/make_shared，避免裸 new/delete；不要用 shared_ptr 替代清晰的所有权设计。$md$,
 null, null, array['cpp','raii','smart-pointer','memory']),

-- Python
((select id from question_category where name = 'Python'), 'medium',
 'Python 的 GIL 是什么？它会影响什么？',
 $md$请说明 GIL 的作用、对多线程的影响，以及 CPU 密集和 IO 密集任务分别怎么处理。$md$,
 $md$GIL 是 CPython 解释器的一把全局锁，保证同一时刻通常只有一个线程执行 Python 字节码，简化了内存管理和解释器实现。IO 等待时线程会释放 GIL，所以多线程适合网络、文件等等待型任务；CPU 密集任务受限于单核，应该用 multiprocessing、原生扩展或把计算下沉到其他服务。GIL 不是 Python 语言规范，其他实现可能不同；它也不能替代业务层的并发安全设计。$md$,
 null, null, array['python','gil','concurrency','thread']),

((select id from question_category where name = 'Python'), 'medium',
 'Python 的迭代器和生成器有什么区别？',
 $md$请说明 iterable、iterator、generator 的关系，以及生成器的惰性求值优势。$md$,
 $md$可迭代对象实现 `__iter__`，迭代器同时实现 `__iter__` 和 `__next__`，耗尽后抛 StopIteration。生成器是用 yield 写出的特殊迭代器，调用时返回生成器对象，按需产出值，适合大文件、流式处理和无限序列，内存占用低。生成器只能遍历一次，支持 send/throw/close；调试和复用不如列表直观。需要多次遍历时要重新创建或物化结果。$md$,
 null, null, array['python','iterator','generator','lazy']),

-- C#
((select id from question_category where name = 'C#'), 'medium',
 'C# 的值类型和引用类型有什么区别？',
 $md$请从内存位置、赋值行为、可空性、装箱和相等性比较说明差异。$md$,
 $md$值类型（struct、int、bool 等）变量直接保存数据，赋值复制值；引用类型（class、数组、string 等）变量保存对象引用，赋值复制引用。值类型默认不能为 null，除非用 Nullable<T>；转成 object 会发生装箱，频繁装箱影响性能。值类型默认按字段比较需注意 struct 的 Equals/GetHashCode 实现，引用类型默认比较引用。内存位置不是绝对规则，闭包和异步状态机可能把值类型提升到堆上。$md$,
 null, null, array['csharp','value-type','reference-type','boxing']),

((select id from question_category where name = 'C#'), 'medium',
 'C# 的 async/await 是如何工作的？',
 $md$请说明 async 方法的状态机、Task 和 SynchronizationContext，以及常见的死锁原因。$md$,
 $md$async 方法编译成状态机，遇到未完成的 await 时保存状态并返回 Task，后续完成后恢复执行；它不自动创建线程，IO 异步靠操作系统回调。默认会捕获 SynchronizationContext 恢复上下文，UI 或旧 ASP.NET 中同步阻塞 `.Result` 可能死锁；库代码可用 ConfigureAwait(false) 避免不必要回调。异步要“一路异步”，不要用 Task.Run 包裹纯 IO，异常通过 Task 传播，取消用 CancellationToken。$md$,
 null, null, array['csharp','async','await','task']),

-- PHP
((select id from question_category where name = 'PHP'), 'medium',
 'PHP-FPM 的请求生命周期是怎样的？',
 $md$请说明 master/worker 进程、请求处理、opcache 和请求结束后的清理。$md$,
 $md$PHP-FPM 由 master 管理 worker 进程池，worker 接收 FastCGI 请求，解析参数、编译并执行脚本，输出响应后清理本次请求的资源。opcache 缓存编译后的字节码，减少重复编译；每个请求的全局状态通常隔离，但静态变量、连接池和扩展资源要谨慎。阻塞 IO 会占住 worker，worker 数不足时请求排队；长任务应异步化。FPM 适合传统请求模型，不适合常驻内存的长连接服务。$md$,
 null, null, array['php','fpm','lifecycle','opcache']),

((select id from question_category where name = 'PHP'), 'medium',
 'Composer 的自动加载是怎么工作的？',
 $md$请说明 PSR-4、classmap、files 自动加载，以及生产环境为什么要优化自动加载。$md$,
 $md$Composer 根据 composer.json 生成 vendor/autoload.php 和映射表；PSR-4 按命名空间前缀映射目录，类名对应文件路径；classmap 扫描并记录具体类文件，适合非 PSR-4 代码；files 在启动时直接引入指定文件，适合函数和常量。生产环境执行 dump-autoload -o 生成优化映射，减少文件系统查找；部署时使用 --no-dev 并固定 lock 文件。修改命名空间或目录后要重新生成 autoload，不能手改 vendor。$md$,
 null, null, array['php','composer','autoload','psr-4']),

-- MongoDB
((select id from question_category where name = 'MongoDB'), 'medium',
 'MongoDB 的文档模型和关系模型应该怎么选？',
 $md$请从聚合边界、读写模式、数据增长和事务需求比较嵌入与引用。$md$,
 $md$MongoDB 适合以聚合根为单位读写、结构灵活、水平扩展的场景。嵌入让一次查询拿到完整文档，减少 join，但数组无界增长会导致文档膨胀和更新成本；引用适合独立生命周期、多对多和频繁单独更新的数据。选型先看查询模式和一致性要求，不要照搬关系模型。跨文档事务可用但成本高，能通过聚合边界或最终一致解决就不要滥用。$md$,
 null, null, array['mongodb','document-model','schema-design','transaction']),

((select id from question_category where name = 'MongoDB'), 'medium',
 'MongoDB 的索引和聚合管道怎么优化？',
 $md$请说明复合索引顺序、explain 和聚合管道中 match/project/sort 的位置。$md$,
 $md$复合索引遵循 ESR：等值字段、排序字段、范围字段的顺序要结合查询设计；用 explain 看是否 IXSCAN、扫描文档数和排序是否走索引。聚合管道尽量把 $match 和 $project 前置，减少后续阶段数据量；$sort 要能利用索引，$group 和 $lookup 成本高，必要时 allowDiskUse 并限制结果集。不要为每个字段建索引，写入和存储成本会上升；定期清理未使用索引。$md$,
 null, null, array['mongodb','index','aggregation','explain']),

-- JavaScript
((select id from question_category where name = 'JavaScript'), 'medium',
 'JavaScript 的闭包是什么？',
 $md$请解释闭包的形成条件、常见用途，以及可能引发的内存问题。$md$,
 $md$闭包是函数与其词法作用域的组合：内部函数引用外部变量，即使外部函数返回后，这些变量仍可被访问。常用于私有状态、函数工厂、防抖节流和模块模式。闭包会延长变量生命周期，持有大对象、DOM 或定时器时可能造成内存泄漏；不再需要的引用要置空并清理监听器。循环中用 var 创建闭包会共享同一个变量，用 let 或立即执行函数可以固定每次迭代的值。$md$,
 null, null, array['javascript','closure','scope','memory']),

((select id from question_category where name = 'JavaScript'), 'medium',
 'JavaScript 的原型链是什么？',
 $md$请说明 prototype、__proto__、constructor 和 instanceof 之间的关系。$md$,
 $md$每个对象都有内部 [[Prototype]]，访问属性时先查自身，再沿原型链向上查找，直到 null。函数的 prototype 属性是其实例的原型对象，实例的 __proto__ 指向它；constructor 只是原型上的一个属性，不是可靠的类型判断。class 是原型继承的语法糖。instanceof 沿原型链判断构造函数的 prototype 是否出现在对象链上；Object.create(null) 创建无原型对象。修改内置原型会影响所有对象，生产代码应避免。$md$,
 null, null, array['javascript','prototype','inheritance','instanceof']),

-- Vue
((select id from question_category where name = 'Vue'), 'medium',
 'Vue 3 的响应式原理是什么？',
 $md$请说明 Proxy、依赖收集、触发更新，以及 ref 和 reactive 的区别。$md$,
 $md$Vue 3 用 Proxy 代理对象，读取时 track 收集当前 effect 依赖，修改时 trigger 通知相关 effect 重新执行；支持新增/删除属性和数组索引。reactive 适合对象，返回 Proxy；ref 用 .value 包装任意值，模板中自动解包。computed 基于依赖缓存，nextTick 在 DOM 更新后执行。Proxy 不能拦截原始值，所以基本类型要用 ref；解构 reactive 会丢失响应性，需要 toRefs。$md$,
 null, null, array['vue','reactivity','proxy','ref']),

((select id from question_category where name = 'Vue'), 'medium',
 'Vue 中 v-if 和 v-show 有什么区别？',
 $md$请从渲染成本、切换成本和适用场景比较 v-if 与 v-show。$md$,
 $md$`v-if` 是条件渲染，条件为假时组件不创建或会被销毁，切换成本高、初始渲染成本低；`v-show` 始终渲染，只切换 CSS display，初始成本高、频繁切换成本低。频繁显示隐藏用 v-show，权限或重组件懒加载用 v-if。v-if 与 v-for 不要同级使用，避免每次渲染都做条件判断；需要隐藏但保留表单状态时 v-show 更合适。$md$,
 null, null, array['vue','v-if','v-show','rendering']),

-- Git
((select id from question_category where name = 'Git'), 'medium',
 'Git 的 merge 和 rebase 有什么区别？',
 $md$请说明两者对提交历史的影响，以及什么时候不应该 rebase。$md$,
 $md$merge 保留分支历史并生成合并提交，适合公共分支和需要保留上下文的场景；rebase 把当前分支提交重放到目标分支之后，历史更线性，但会改写提交哈希。不要对已经推送并被他人使用的分支 rebase，否则会给协作者制造分叉。rebase 冲突要逐个提交解决，可用 rebase --continue/--abort；合并前可用 squash 整理提交。团队应统一策略，避免历史反复改写。$md$,
 null, null, array['git','merge','rebase','history']),

((select id from question_category where name = 'Git'), 'medium',
 'Git 的 reset 和 revert 有什么区别？',
 $md$请说明两者对工作区、暂存区和提交历史的影响，以及共享分支应该用哪个。$md$,
 $md$reset 移动当前分支指针，可配合 --soft/--mixed/--hard 改变暂存区和工作区，适合本地未推送提交；--hard 会丢弃未提交修改，风险高。revert 生成一个反向提交，保留原提交历史，适合已经推送的公共分支。误操作后可用 reflog 找回 reset 前的提交，但不要依赖它替代备份。共享分支优先 revert，避免强制推送破坏他人历史。$md$,
 null, null, array['git','reset','revert','reflog']),

-- Nginx
((select id from question_category where name = 'Nginx'), 'medium',
 'Nginx 的反向代理和负载均衡怎么配置？',
 $md$请说明 proxy_pass、upstream、常见负载策略和必要的转发头。$md$,
 $md$用 upstream 定义后端节点，proxy_pass 把请求转发到 upstream 或具体地址。常见策略有轮询、weight、least_conn、ip_hash；ip_hash 可做简单会话保持但扩容会漂移。要透传 Host、X-Real-IP、X-Forwarded-For、X-Forwarded-Proto，设置连接和读取超时，处理 502/504。健康检查和失败重试要结合业务，避免把重试放大成雪崩；静态资源可单独缓存。$md$,
 null, null, array['nginx','reverse-proxy','load-balancing','upstream']),

((select id from question_category where name = 'Nginx'), 'medium',
 'Nginx 为什么适合高并发？',
 $md$请从进程模型、事件驱动和阻塞操作角度解释它高并发的原因和边界。$md$,
 $md$Nginx 采用 master-worker 模型，worker 使用 epoll/kqueue 等事件驱动机制，非阻塞地处理大量连接，避免为每个连接创建线程；静态文件可用 sendfile 减少拷贝。但高并发不是无限的：worker_connections、文件描述符、上游慢响应、磁盘 IO 和阻塞模块都会成为瓶颈。耗时逻辑应交给后端或异步处理，不要让 Nginx 做重计算；还要配置限流、超时和缓冲区，防止慢连接耗尽资源。$md$,
 null, null, array['nginx','epoll','event-driven','performance']),

-- DevOps
((select id from question_category where name = 'DevOps'), 'medium',
 '一条可靠的 CI/CD 流水线应该包含哪些阶段？',
 $md$请说明构建、测试、制品、部署、审批和回滚的关键设计。$md$,
 $md$典型阶段是检出、依赖缓存、编译、单元/集成测试、静态扫描、构建不可变制品、推送镜像、部署到环境、冒烟验证。制品要带版本和摘要，环境配置通过变量或 Secret 注入；生产发布要有审批、灰度和回滚策略。流水线应幂等、可重跑，失败要保留日志和制品。不要在 CI 日志输出密钥，也不要让流水线直接在生产机器上手工改文件。$md$,
 null, null, array['devops','ci-cd','pipeline','deployment']),

((select id from question_category where name = 'DevOps'), 'medium',
 '基础设施即代码（IaC）解决什么问题？',
 $md$请说明 IaC 的可重复性、漂移检测、评审和状态管理。$md$,
 $md$IaC 把服务器、网络、数据库等资源写成可版本控制的代码，环境可以重复创建，变更可评审、可回滚，减少“雪花服务器”。工具通过 plan/diff 预览变更，用 state 记录真实资源，但 state 也可能漂移，需要定期刷新和锁定。密钥不能写进代码，要用 Secret 管理；大规模变更要分环境、分批次，评估爆炸半径。IaC 不是自动化的同义词，仍需测试和审批。$md$,
 null, null, array['devops','iac','terraform','reproducible']),

-- AI 应用开发
((select id from question_category where name = 'AI 应用开发'), 'medium',
 'RAG 的基本流程是什么？',
 $md$请说明文档入库、切分、向量化、检索、重排和生成回答的关键步骤。$md$,
 $md$离线阶段解析文档、清洗、按语义切分、生成 embedding 并写入向量库，同时保留来源和权限元数据；在线阶段把问题向量化，检索 Top-K 片段，必要时用关键词和向量混合检索，再重排、裁剪上下文交给模型生成答案。回答要带引用，低置信度时明确说不知道。切分粒度、embedding 模型、召回率和评测集决定效果；还要处理文档更新、删除和权限过滤。$md$,
 null, null, array['ai','rag','embedding','retrieval']),

((select id from question_category where name = 'AI 应用开发'), 'medium',
 'AI 应用的 Prompt 注入应该怎么防？',
 $md$请说明提示注入的来源、防护边界，以及工具调用场景下的额外风险。$md$,
 $md$提示注入来自用户输入、检索文档、网页和工具返回，不能靠一句“忽略恶意指令”解决。要把系统指令与不可信数据隔离，明确数据不具指令权限；对工具调用做白名单、参数校验和最小权限，高风险操作需要人工确认；输出要做结构校验和敏感信息过滤。RAG 要过滤不可信来源，Agent 要限制步数、超时和可访问资源。提示注入无法完全消除，应按“模型可能被诱导”设计纵深防御。$md$,
 null, null, array['ai','prompt-injection','security','agent']),

-- AI Agent
((select id from question_category where name = 'AI Agent'), 'medium',
 'AI Agent 的 Agent Loop 是什么？',
 $md$请说明观察、规划、调用工具、反思和停止条件，以及工程上如何避免死循环。$md$,
 $md$Agent Loop 是模型反复“观察当前状态 → 规划下一步 → 调用工具 → 读取结果 → 修正计划”的循环，直到满足停止条件或达到预算。工程上要设置最大步数、超时、 token 预算和工具失败重试上限；工具结果要结构化并校验，状态要可追踪。没有停止条件、工具反复失败或任务描述模糊时容易死循环，应降级为向用户追问或返回部分结果。高风险工具调用需要审批和审计。$md$,
 null, null, array['ai','agent','agent-loop','tool-calling']),

((select id from question_category where name = 'AI Agent'), 'medium',
 'MCP 和普通 Tool Calling 是什么关系？',
 $md$请说明 MCP 解决的集成问题，以及接入工具时需要注意的权限和超时。$md$,
 $md$Tool Calling 是模型输出“调用哪个工具、传什么参数”的能力；MCP 是让应用以统一协议发现和调用外部工具、资源和提示的集成层。MCP 把工具提供方与 Agent 解耦，便于复用和权限管理，但模型最终仍通过 tool call 使用这些能力。接入时要校验工具 schema、限制可访问资源、设置超时和重试、处理返回内容中的提示注入；高风险操作要人工确认并记录审计日志。$md$,
 null, null, array['ai','mcp','tool-calling','agent']),

-- 前端手写代码
((select id from question_category where name = '前端手写代码'), 'medium',
 '手写防抖和节流，它们有什么区别？',
 $md$请说明 debounce 与 throttle 的触发时机、定时器清理和典型使用场景。$md$,
 $md$防抖是在最后一次触发后等待一段时间才执行，期间再次触发会重置计时，适合搜索输入、窗口 resize 后计算；节流是固定时间窗口内最多执行一次，适合滚动、拖拽和按钮防连点。实现时都要返回取消函数并在组件卸载时清理定时器；防抖有 leading/trailing 选项，节流有首次立即执行或末次补执行。不要用同一个实现混用两种语义，异步回调还要处理竞态。$md$,
 null, null, array['frontend','debounce','throttle','handwrite']),

((select id from question_category where name = '前端手写代码'), 'hard',
 '手写一个深拷贝，需要处理哪些边界？',
 $md$请说明循环引用、Date/Map/Set、Symbol、原型和函数分别怎么处理。$md$,
 $md$深拷贝要递归复制对象并保持类型：用 WeakMap 记录已拷贝对象解决循环引用；Date、RegExp、Map、Set 需要单独构造；Symbol 作为键时用 Reflect.ownKeys 遍历；数组和普通对象保留原型可用 Object.create(Object.getPrototypeOf(value))。函数通常不复制，直接返回引用；DOM、WeakMap、Promise 等宿主或不可克隆对象不应盲目递归。生产环境优先 structuredClone，但它不支持函数和部分宿主对象。$md$,
 null, null, array['frontend','deep-clone','handwrite','javascript']),

-- 前端代码分析
((select id from question_category where name = '前端代码分析'), 'medium',
 '前端内存泄漏通常怎么排查？',
 $md$请列举常见泄漏源，以及 Chrome DevTools 中堆快照和分配时间线的用法。$md$,
 $md$常见泄漏源包括未移除的事件监听、定时器、IntersectionObserver/ResizeObserver、全局缓存、闭包持有大对象、脱离文档的 DOM 引用和未取消的请求。排查时先复现操作路径，用 Performance monitor 看内存是否持续上升，再用 Heap snapshot 对比前后对象和 retained size，配合 allocation timeline 找增长来源。修复后在组件卸载或路由切换时清理监听器、定时器和订阅，并用弱引用或 LRU 控制缓存。$md$,
 null, null, array['frontend','memory-leak','devtools','performance']),

((select id from question_category where name = '前端代码分析'), 'medium',
 '如何定位前端长任务和卡顿？',
 $md$请说明 Performance 面板、Long Task、React Profiler 和主线程阻塞的排查思路。$md$,
 $md$先用 Performance 录制真实交互，查看主线程长任务、脚本执行、样式布局和绘制占比；Long Task 超过 50ms 会阻塞输入响应。React 应用用 Profiler 看哪些组件重复渲染、渲染耗时和提交阶段；结合 PerformanceObserver 的 longtask 做线上监控。优化方向包括拆分大组件、虚拟列表、代码分割、Web Worker、减少同步布局和批量更新。不要只看 Lighthouse 分数，要回到真实用户路径和 INP。$md$,
 null, null, array['frontend','long-task','performance','react']),

-- 系统运维
((select id from question_category where name = '系统运维'), 'medium',
 '服务器磁盘满了应该怎么排查？',
 $md$请说明 df/du、被删除但仍被占用的文件、inode 和容器日志的排查顺序。$md$,
 $md$先用 df -h 看分区和 inode 使用率，再用 du -xhd1 逐层定位大目录；如果 df 显示满但 du 找不到大文件，检查被删除但仍被进程打开的文件，用 lsof +L1 找出并重启或清空对应进程。还要看日志轮转、Docker overlay、数据库 binlog 和临时文件。清理前确认文件用途，优先轮转和归档，不要直接删数据库文件；设置磁盘和 inode 告警，避免再次写满。$md$,
 null, null, array['ops','disk','linux','troubleshooting']),

((select id from question_category where name = '系统运维'), 'medium',
 'systemd 服务应该如何管理？',
 $md$请说明 unit 文件、启停、开机自启、日志和重启策略的常用做法。$md$,
 $md$把服务写成 /etc/systemd/system/xxx.service，声明 ExecStart、WorkingDirectory、User、Environment/EnvironmentFile 和 Restart。用 systemctl daemon-reload 后 start/enable/status，日志用 journalctl -u 查看。生产环境用非 root 用户、限制权限和资源，配置 Restart=on-failure 与启动间隔，避免崩溃循环。不要把 nohup 当服务管理；修改 unit 后要重新加载，部署脚本应幂等并检查健康状态。$md$,
 null, null, array['ops','systemd','linux','service']),

-- 操作系统补 1 道
((select id from question_category where name = '操作系统'), 'medium',
 '死锁的四个必要条件是什么？如何破坏？',
 $md$请说明互斥、占有并等待、不可抢占、循环等待，并给出工程上的预防手段。$md$,
 $md$死锁需要同时满足互斥、占有并等待、不可抢占和循环等待。破坏任一条件即可预防：资源尽量无锁或可共享；一次性申请全部资源，避免持有再等待；允许超时释放或抢占；给锁定义全局顺序，避免循环等待。工程上还可用带超时的锁、死锁检测和监控告警，但超时只是兜底。数据库和应用层要统一锁顺序，避免嵌套锁顺序不一致。$md$,
 null, null, array['os','deadlock','concurrency','lock']);
