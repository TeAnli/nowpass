-- 扩充题库：新增 6 个知识标签与 30 道面试题。

insert into question_category (name, sort, icon)
values ('分布式系统', 120, 'lucide:share-2'),
       ('微服务', 130, 'lucide:boxes'),
       ('数据结构与算法', 140, 'lucide:binary'),
       ('容器与云原生', 150, 'logos:docker-icon'),
       ('Web 安全', 160, 'lucide:shield-check'),
       ('Linux', 170, 'lucide:terminal');

insert into question (category_id, difficulty, title, content_md, answer_md, options, answer_key, tags)
values
-- 分布式系统
((select id from question_category where name = '分布式系统'), 'medium',
 'CAP 定理是什么？为什么不能同时满足三者？',
 $md$请解释 CAP 中的一致性、可用性和分区容错性，并说明实际系统为什么通常选择 AP 或 CP。$md$,
 $md$CAP 指一致性（所有节点看到同一份最新数据）、可用性（每个请求都能得到非错误响应）、分区容错性（网络分区时系统仍能继续运行）。分布式系统必须容忍网络分区，因此只能在 C 与 A 之间取舍：分区时拒绝部分请求以保一致，还是继续响应但可能返回旧数据。实际系统通常是 CP 或 AP 的倾向，并通过最终一致、补偿和对账降低业务影响。$md$,
 null, null, array['distributed','cap','consistency','availability']),

((select id from question_category where name = '分布式系统'), 'hard',
 '分布式锁有哪些实现？Redis 分布式锁要注意什么？',
 $md$比较数据库、Redis、ZooKeeper 三类分布式锁，并说明 Redis 锁的常见坑。$md$,
 $md$数据库锁依赖唯一索引或行锁，简单但性能和可用性有限；Redis 锁性能好，适合短临界区；ZooKeeper/etcd 基于临时有序节点，具备会话失效释放与较强一致性。Redis 锁要注意：加锁必须原子（SET NX PX）；释放必须校验持有者并用 Lua 原子删除；业务执行时间可能超过锁过期时间，需要续期或 fencing token；主从切换可能丢锁。不要把 Redis 锁当成强一致事务的替代。$md$,
 null, null, array['distributed','lock','redis','zookeeper']),

((select id from question_category where name = '分布式系统'), 'hard',
 '分布式事务有哪些方案？TCC、Saga、本地消息表怎么选？',
 $md$请说明常见分布式事务方案的一致性、复杂度与适用场景。$md$,
 $md$2PC 强一致但阻塞、协调者单点；TCC 通过 Try/Confirm/Cancel 预留资源，一致性强但业务侵入大；Saga 把长事务拆成可补偿步骤，适合长流程但只保证最终一致；本地消息表/事务消息通过可靠消息 + 幂等消费实现最终一致，适合跨服务异步场景。选择时看一致性要求、流程长度、失败补偿成本和团队运维能力，不要为了强一致给所有链路加 TCC。$md$,
 null, null, array['distributed','transaction','tcc','saga']),

((select id from question_category where name = '分布式系统'), 'medium',
 '熔断、降级、限流分别解决什么问题？',
 $md$三者经常一起出现，请说明它们的目标和执行位置。$md$,
 $md$限流控制进入系统的流量，保护自身不被压垮；熔断在依赖持续失败时快速失败，避免线程和连接被耗尽；降级是在资源不足或依赖不可用时返回兜底结果，保证核心链路可用。限流通常在最外层或网关，熔断在客户端调用依赖处，降级在业务层。三者都需要可观测指标和恢复策略，不能只配置阈值不看效果。$md$,
 null, null, array['distributed','resilience','circuit-breaker','rate-limit']),

((select id from question_category where name = '分布式系统'), 'medium',
 '一致性哈希解决什么问题？虚拟节点有什么用？',
 $md$说明一致性哈希在缓存和分片中的作用，以及虚拟节点如何改善数据倾斜。$md$,
 $md$普通取模在节点增减时会导致大量 key 重新映射；一致性哈希把节点和 key 映射到同一环上，节点变化只影响相邻区间，减少迁移量。物理节点较少时容易分布不均，虚拟节点让一个物理节点对应多个环上位置，从而均衡负载并让扩容更平滑。它适合缓存路由和分片，但热点 key 仍需要单独治理。$md$,
 null, null, array['distributed','consistent-hashing','sharding','cache']),

-- 微服务
((select id from question_category where name = '微服务'), 'medium',
 '微服务拆分的边界应该怎么定？',
 $md$是按团队、按技术层，还是按业务能力拆分？如何避免拆得过细？$md$,
 $md$优先按业务能力与限界上下文拆分，让一个服务拥有相对完整的数据和业务闭环，而不是按 Controller/Service/DAO 技术层拆。判断边界看变更频率、数据耦合、团队所有权和故障隔离需求。拆得过细会带来分布式事务、网络调用和运维成本；拆得太粗又失去独立演进。可以从单体模块化开始，等边界稳定后再拆服务。$md$,
 null, null, array['microservices','ddd','boundary','architecture']),

((select id from question_category where name = '微服务'), 'medium',
 '服务注册与发现的原理是什么？Nacos 和 Eureka 有什么区别？',
 $md$服务如何注册、发现、健康检查和摘除？注册中心自身如何保证可用？$md$,
 $md$服务启动后把地址和元数据注册到注册中心，消费者拉取或订阅服务列表，并通过心跳/健康检查判断实例可用性；实例下线或失联后注册中心摘除。Nacos 同时提供配置中心和服务发现，支持 AP/CP 模式；Eureka 主要做 AP 注册发现，强调可用性，客户端缓存服务列表。无论哪种，都要处理注册中心不可用时的本地缓存、重试和过期实例问题。$md$,
 null, null, array['microservices','registry','nacos','eureka']),

((select id from question_category where name = '微服务'), 'medium',
 '配置中心要解决什么问题？配置变更如何安全生效？',
 $md$为什么不能把配置直接写在每个服务的 application.yml 里？$md$,
 $md$配置中心集中管理多环境、多实例配置，支持版本、灰度、权限和审计，避免改配置要重新打包。安全生效需要：变更审批与版本回滚；推送给实例后做校验；对关键配置采用灰度发布；配置热更新要保证线程安全和可回滚。数据库密码、SMTP 授权码等敏感信息应加密或以 Secret 注入，不应明文暴露在配置页面。$md$,
 null, null, array['microservices','config-center','nacos','operations']),

((select id from question_category where name = '微服务'), 'hard',
 '跨服务链路变慢，如何定位瓶颈？',
 $md$请说明链路追踪、指标和日志在排障中的分工，以及常见误区。$md$,
 $md$先用指标看整体错误率、P95/P99 延迟和饱和度，再通过 traceId 把一次请求的跨服务调用串起来，定位是哪个 span 变慢；日志补充异常、参数和下游返回。注意异步线程、消息队列和数据库连接池要传递上下文；平均延迟正常不代表没有长尾。定位后要区分网络、排队、锁竞争、GC 和下游限流，不能只看一个服务的 CPU。$md$,
 null, null, array['microservices','observability','tracing','performance']),

((select id from question_category where name = '微服务'), 'medium',
 '微服务如何做灰度发布？',
 $md$灰度发布需要哪些流量路由能力和回滚保障？$md$,
 $md$灰度发布通常按用户、请求头、地域或比例把流量路由到新版本，需要网关/服务网格支持标签路由，注册中心或配置中心维护版本元数据。发布前要有兼容性检查、数据库变更向后兼容和监控基线；发布中观察错误率、延迟和业务指标；异常时快速切回旧版本。数据库结构变更优先采用 expand-contract，避免新旧版本同时运行时互相破坏。$md$,
 null, null, array['microservices','release','canary','rollback']),

-- 数据结构与算法
((select id from question_category where name = '数据结构与算法'), 'easy',
 '数组、链表、哈希表、平衡树分别适合什么场景？',
 $md$从访问、插入删除、有序性和内存布局角度比较。$md$,
 $md$数组支持 O(1) 随机访问、缓存友好，但中间插入删除要搬移；链表插入删除 O(1)，但访问要遍历且指针有额外开销；哈希表平均 O(1) 查找，但不保序且要考虑冲突和扩容；平衡树支持 O(log n) 查找、插入、删除和有序范围查询。工程里先看访问模式和是否需要顺序，再考虑常数与内存。$md$,
 null, null, array['algorithm','data-structure','array','hash-table']),

((select id from question_category where name = '数据结构与算法'), 'medium',
 '快速排序最坏情况是什么？如何避免？',
 $md$说明快排退化的条件、复杂度和工程上的优化。$md$,
 $md$快排平均 O(n log n)，但当每次划分都极不均衡时退化为 O(n²)，例如已排序数组固定选第一个元素为 pivot。避免方法：随机选 pivot、三数取中、三路划分处理大量重复元素、对小数组切换插入排序、递归深度过大时切换堆排序。快排不稳定；如果要求稳定排序应使用归并排序。$md$,
 null, null, array['algorithm','sorting','quicksort','complexity']),

((select id from question_category where name = '数据结构与算法'), 'medium',
 '动态规划的解题步骤是什么？',
 $md$如何从暴力递归推导状态定义、转移方程和边界？$md$,
 $md$先明确“状态表示什么”，再找状态之间的转移，确定初始条件和计算顺序，最后考虑空间压缩。关键是识别重叠子问题和最优子结构；如果子问题互相独立，可能更适合分治。做题时先写递归定义并加记忆化，再改成自底向上，避免一上来套模板。还要检查状态是否遗漏、边界是否越界，以及是否能用滚动数组降低空间。$md$,
 null, null, array['algorithm','dynamic-programming','recursion','complexity']),

((select id from question_category where name = '数据结构与算法'), 'medium',
 'B+ 树为什么适合做数据库索引？',
 $md$和二叉搜索树、哈希索引相比，B+ 树在磁盘场景有什么优势？$md$,
 $md$B+ 树是多路平衡树，单个节点能容纳更多 key，树高低，减少磁盘随机 I/O；所有数据在叶子节点且叶子间有链表，适合范围查询和顺序扫描；内部节点只存索引，缓存利用率高。哈希索引适合等值查询但不支持范围；二叉树在磁盘上树高过大。数据库还会结合聚簇索引、覆盖索引和页大小设计，B+ 树不是唯一索引结构，但很适合通用 OLTP。$md$,
 null, null, array['algorithm','b-plus-tree','database','index']),

((select id from question_category where name = '数据结构与算法'), 'medium',
 'Top K 问题怎么做？堆和快速选择如何取舍？',
 $md$从海量数据中找最大或最小的 K 个元素，有哪些方案？$md$,
 $md$维护大小为 K 的小顶堆，遍历数据，堆顶是当前第 K 大，时间 O(n log K)，适合流式数据和内存受限场景。快速选择基于快排划分，平均 O(n)，但会修改数组且最坏 O(n²)，适合一次性静态数据。数据量极大且不能全部装入内存时，可先分片统计再合并。实际选择要看数据规模、是否流式、是否允许修改输入和 K 的大小。$md$,
 null, null, array['algorithm','heap','top-k','selection']),

-- 容器与云原生
((select id from question_category where name = '容器与云原生'), 'easy',
 '容器和虚拟机的区别是什么？',
 $md$从隔离层次、启动速度、资源开销和镜像交付角度比较。$md$,
 $md$虚拟机通过 Hypervisor 虚拟硬件，每个 VM 有独立内核，隔离强但启动慢、资源开销大；容器共享宿主机内核，通过 namespace 做隔离、cgroups 做资源限制，启动快、镜像分层复用、密度高。容器隔离性弱于 VM，内核漏洞和逃逸风险需要额外防护。两者不是互斥关系，很多云环境是在 VM 里跑容器。$md$,
 null, null, array['container','virtual-machine','isolation','cloud-native']),

((select id from question_category where name = '容器与云原生'), 'medium',
 'Docker 镜像分层和联合文件系统解决了什么问题？',
 $md$为什么多个镜像可以共享基础层？容器写文件时会发生什么？$md$,
 $md$镜像由只读层叠加而成，每条 Dockerfile 指令生成一层，层可以被多个镜像共享，减少存储和传输。运行时在只读层之上加一个可写层，采用写时复制：读文件直接读下层，修改时先把文件复制到可写层再改。容器删除后可写层丢失，所以需要 volume 持久化数据。镜像层数不是越少越好，要平衡缓存命中、可读性和最终体积。$md$,
 null, null, array['docker','image','overlayfs','container']),

((select id from question_category where name = '容器与云原生'), 'medium',
 'Kubernetes 中 Pod、Deployment、Service 分别负责什么？',
 $md$请说明三者的职责边界和它们之间的关系。$md$,
 $md$Pod 是最小调度单元，包含一个或多个共享网络和存储的容器；Deployment 管理无状态 Pod 的副本数、滚动更新和回滚；Service 为一组 Pod 提供稳定虚拟 IP 和负载均衡，通过 selector 选择后端。Pod 会漂移和重建，不能直接把 Pod IP 当稳定地址；需要对外暴露时再使用 Ingress 或 LoadBalancer。$md$,
 null, null, array['kubernetes','pod','deployment','service']),

((select id from question_category where name = '容器与云原生'), 'medium',
 'Kubernetes 的滚动更新和健康探针如何配合？',
 $md$liveness、readiness、startup 探针分别解决什么问题？配置不当会怎样？$md$,
 $md$Deployment 滚动更新逐步替换 Pod，配合 readinessProbe 确保新 Pod 就绪后再接流量；livenessProbe 失败会重启容器，用于进程假死；startupProbe 用于启动很慢的应用，避免启动期间被误杀。liveness 配得太激进会造成重启风暴，readiness 配得太宽松会把未就绪实例接入流量。探针要检查真实依赖和业务就绪状态，不能只 ping 端口。$md$,
 null, null, array['kubernetes','probe','rolling-update','availability']),

((select id from question_category where name = '容器与云原生'), 'medium',
 '云原生应用的配置和密钥应该怎么管理？',
 $md$为什么不能把配置和密钥打进镜像？如何做环境隔离与轮换？$md$,
 $md$镜像应保持不可变，配置通过 ConfigMap、环境变量或配置中心注入；密钥使用 Secret，但 Kubernetes Secret 默认只是 base64，不是加密，生产应结合外部密钥管理、密封 Secret 或云 KMS。不同环境使用独立命名空间和凭据，密钥定期轮换，容器以最小权限读取。不要把密钥写入 Git、镜像层或日志。$md$,
 null, null, array['cloud-native','secret','configmap','security']),

-- Web 安全
((select id from question_category where name = 'Web 安全'), 'medium',
 'XSS 和 CSRF 的区别是什么？分别如何防御？',
 $md$从攻击目标、触发方式和防御手段比较两类漏洞。$md$,
 $md$XSS 是把恶意脚本注入页面，在受害者浏览器执行，窃取 Cookie、篡改页面或发起请求；防御核心是输出编码、上下文转义、CSP、避免 innerHTML 和不可信 HTML。CSRF 是借用用户已登录的 Cookie 伪造请求，攻击者不需要读取响应；防御用 SameSite Cookie、CSRF Token、校验 Origin/Referer。HttpOnly 能缓解 XSS 窃取 Cookie，但不能阻止 XSS 本身。$md$,
 null, null, array['security','xss','csrf','web']),

((select id from question_category where name = 'Web 安全'), 'medium',
 'SQL 注入如何产生？预编译为什么能防住？',
 $md$为什么字符串拼接有风险，而参数化查询更安全？还有哪些补充措施？$md$,
 $md$SQL 注入来自把用户输入当 SQL 语法拼接，攻击者可改变查询结构。预编译/参数化查询把 SQL 结构与参数值分离，参数只作为数据绑定，不参与语法解析，因此能防止经典注入。补充措施包括最小权限数据库账号、输入校验、ORM 参数绑定、错误信息脱敏和审计。不要用“过滤关键字”代替参数化查询。$md$,
 null, null, array['security','sql-injection','prepared-statement','database']),

((select id from question_category where name = 'Web 安全'), 'medium',
 'JWT 和 Session 各有什么取舍？',
 $md$从状态存储、撤销、扩展性和安全性比较两种认证方案。$md$,
 $md$Session 把状态放服务端或 Redis，浏览器只存 session id，撤销方便但需要共享存储；JWT 自包含、便于跨服务传递，但签发后难以即时撤销，且 payload 可被读取，不能放敏感信息。JWT 适合短期访问令牌配合刷新令牌；Session 适合需要强会话控制和即时下线的系统。两者都必须使用 HTTPS、HttpOnly/Secure Cookie 或安全存储，并防范 XSS/CSRF。$md$,
 null, null, array['security','jwt','session','auth']),

((select id from question_category where name = 'Web 安全'), 'medium',
 'HTTPS 如何保证传输安全？',
 $md$握手阶段解决了哪些问题？证书校验为什么重要？$md$,
 $md$HTTPS 用非对称加密/密钥交换协商出对称会话密钥，之后用对称加密保证机密性，用 MAC/AEAD 保证完整性，证书链和域名校验确认服务器身份，防止中间人。证书校验必须开启，不能随意信任自签证书；HSTS 可以强制浏览器走 HTTPS。TLS 版本、加密套件和证书轮换都要纳入运维，HTTPS 也不能防止服务端业务漏洞。$md$,
 null, null, array['security','https','tls','certificate']),

((select id from question_category where name = 'Web 安全'), 'medium',
 '越权漏洞怎么测试和防护？',
 $md$水平越权和垂直越权有什么区别？为什么前端隐藏按钮不够？$md$,
 $md$水平越权是普通用户访问同权限其他用户的数据，垂直越权是低权限用户调用高权限接口。测试要替换资源 id、修改角色参数、直接调用未展示接口，并检查服务端是否按当前登录主体做数据归属校验。防护必须在服务端每次请求校验权限和数据范围，不能依赖前端隐藏按钮；接口返回也要最小化字段，避免泄露敏感信息。$md$,
 null, null, array['security','authorization','idor','rbac']),

-- Linux
((select id from question_category where name = 'Linux'), 'medium',
 'Linux 中进程和线程如何表示？',
 $md$从 task_struct、地址空间和调度角度说明进程与线程的关系。$md$,
 $md$Linux 内核统一用 task_struct 表示调度实体；线程是共享地址空间、文件描述符等资源的 task，进程可以理解为资源组。创建线程常用 clone 并指定共享标志。用户态看到的是进程 PID 和线程 TID，/proc 下每个线程也有对应目录。线程切换不需要切换页表，进程切换通常需要切换地址空间，因此线程更轻，但隔离性更弱。$md$,
 null, null, array['linux','process','thread','kernel']),

((select id from question_category where name = 'Linux'), 'hard',
 'select、poll、epoll 的区别是什么？',
 $md$从数据结构、事件通知方式和适用场景比较三种 I/O 多路复用机制。$md$,
 $md$select 用位图保存 fd，有数量上限，每次调用都要把集合从用户态拷贝到内核并线性扫描；poll 用数组去掉了数量上限，但仍需遍历；epoll 在内核维护红黑树和就绪链表，通过回调把就绪 fd 放入链表，适合大量连接中只有少量活跃的场景。epoll 有水平触发和边缘触发，边缘触发必须一次读到 EAGAIN。连接少且频繁变化时 poll/select 也可能够用。$md$,
 null, null, array['linux','io-multiplexing','epoll','performance']),

((select id from question_category where name = 'Linux'), 'hard',
 '内存泄漏或 OOM 如何排查？',
 $md$请给出从系统指标到进程、线程和堆的排查顺序。$md$,
 $md$先看 free、/proc/meminfo、dmesg 和 OOM killer 日志确认是系统内存不足还是单进程泄漏；再用 ps/top 找 RSS 异常进程，pmap、/proc/pid/smaps 看映射，jmap/heap dump 分析 Java 堆，jstack 看线程和阻塞。结合 GC 日志区分堆泄漏、堆外内存、线程栈和 mmap。修复后要加内存上限、监控和压测回归，不能只重启了事。$md$,
 null, null, array['linux','memory','oom','troubleshooting']),

((select id from question_category where name = 'Linux'), 'medium',
 'CPU 负载很高，如何定位原因？',
 $md$load average、CPU 使用率和上下文切换分别说明什么？$md$,
 $md$先看 uptime/load 与 CPU 核数的关系，再用 top/pidstat 找高 CPU 进程和线程；us 高看业务计算，sy 高看系统调用，wa 高看 I/O 等待，si/hi 看中断。用 perf、火焰图定位热点函数，用 pidstat -w 看上下文切换，用 iostat 排除磁盘瓶颈。load 高不一定是 CPU 忙，也可能是大量不可中断 I/O 或线程排队。$md$,
 null, null, array['linux','cpu','performance','troubleshooting']),

((select id from question_category where name = 'Linux'), 'easy',
 '硬链接和软链接有什么区别？',
 $md$从 inode、跨文件系统和删除行为比较 hard link 与 symbolic link。$md$,
 $md$硬链接指向同一 inode，多个目录项共享同一份数据，不能跨文件系统，也不能链接目录；删除其中一个目录项不会删除数据，直到链接计数为 0。软链接是独立文件，内容是目标路径，可以跨文件系统、链接目录，目标删除后会变成悬空链接。部署中常用软链接做版本切换，硬链接适合同一文件系统内的去重和备份。$md$,
 null, null, array['linux','filesystem','inode','symlink']);
