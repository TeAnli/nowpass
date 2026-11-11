-- 扩充题库：新增 6 个分类与 30 道原创面试题。
-- 覆盖前端、TypeScript、浏览器、性能、测试与架构设计，避免与已有题目重复。

insert into question_category (name, sort, icon)
values ('React', 180, 'logos:react'),
       ('TypeScript', 190, 'logos:typescript-icon'),
       ('浏览器与前端工程化', 200, 'lucide:monitor-smartphone'),
       ('性能优化', 210, 'lucide:gauge'),
       ('测试与质量', 220, 'lucide:flask-conical'),
       ('架构设计', 230, 'lucide:layout-template');

insert into question (category_id, difficulty, title, content_md, answer_md, options, answer_key, tags)
values
-- React
((select id from question_category where name = 'React'), 'medium',
 'React 为什么强调不可变状态？',
 $md$请解释 React 中直接修改对象状态会带来什么问题，以及不可变更新如何配合渲染与优化。$md$,
 $md$React 通过引用比较判断状态是否变化，直接修改原对象再调用 setState，引用没变，组件可能不会重新渲染；memo、useMemo、useEffect 的依赖判断也会失真。不可变更新返回新对象，让每次渲染拿到一致快照，便于并发渲染、时间旅行和调试。实践中用展开运算符或结构化更新，只复制变化的层级，不需要深拷贝整棵树；同时避免在 render 中修改 props 或 state。$md$,
 null, null, array['react','state','immutability']),

((select id from question_category where name = 'React'), 'medium',
 'useEffect 的依赖数组和清理函数如何工作？',
 $md$请说明 useEffect 的执行时机、依赖比较规则，以及清理函数在什么情况下执行。$md$,
 $md$useEffect 在提交阶段之后执行；依赖数组用 Object.is 逐项比较，空数组只执行一次，省略依赖则每次渲染后都执行。返回的清理函数会在下一次 effect 执行前和组件卸载时调用，用来取消订阅、清除定时器或中断请求。依赖缺失会读到旧闭包，依赖里放临时对象又会导致重复执行；应把 effect 用到的响应式值列全，必要时用 useCallback/useMemo 稳定引用。开发环境的 StrictMode 会额外执行一次挂载与清理，用于暴露副作用问题。$md$,
 null, null, array['react','useeffect','hooks']),

((select id from question_category where name = 'React'), 'medium',
 'React 列表的 key 为什么不能用数组下标？',
 $md$请解释 key 在协调过程中的作用，以及使用数组下标可能引发的状态错乱。$md$,
 $md$key 是 React 判断同级节点身份的依据。列表插入、删除或排序后，数组下标会变化，React 可能把旧组件的状态复用到错误的行上，导致输入框内容、展开状态或动画错位。应使用稳定且唯一的业务 ID；只有在列表完全静态、不会重排时才可以用下标。key 只需在兄弟节点间唯一，不会作为 prop 传给组件，也不要用随机数导致每次都重建。$md$,
 null, null, array['react','list','reconciliation']),

((select id from question_category where name = 'React'), 'medium',
 'useMemo 和 useCallback 什么时候值得用？',
 $md$请说明两者的区别、适用场景，以及滥用 memo 化可能带来的问题。$md$,
 $md$useMemo 缓存计算结果，useCallback 缓存函数引用；它们都依赖依赖数组，依赖变化就重新计算。适合昂贵计算，或需要把稳定引用传给 memo 子组件、作为其他 Hook 的依赖。普通轻量计算加 useMemo 反而增加比较和内存成本，还容易因为依赖写错产生旧值。不要为了“看起来优化”包裹所有函数；先用 Profiler 找到真实瓶颈，再决定 memo 化边界。$md$,
 null, null, array['react','usememo','usecallback','performance']),

((select id from question_category where name = 'React'), 'hard',
 'React 18 的并发渲染解决了什么问题？',
 $md$请解释 concurrent rendering 与 startTransition、Suspense 的关系，以及它是否让业务代码自动并行。$md$,
 $md$并发渲染让渲染工作可中断、可恢复，并能区分紧急更新和可延迟更新，避免长任务阻塞输入。startTransition/useDeferredValue 把非紧急更新降级，Suspense 让等待中的子树显示 fallback。它不是让组件代码并行执行，也不自动消除慢组件；状态更新仍需保持纯函数和不可变。外部状态库要接入 useSyncExternalStore，避免撕裂。并发特性适合大列表筛选、路由切换等场景，不应作为掩盖性能问题的万能开关。$md$,
 null, null, array['react','concurrent','suspense','transition']),

-- TypeScript
((select id from question_category where name = 'TypeScript'), 'easy',
 'type 和 interface 应该怎么选？',
 $md$请比较 type alias 与 interface 的能力差异，并给出选择建议。$md$,
 $md$两者都能描述对象形状。interface 支持声明合并和 extends，适合对外暴露、可能被扩展的对象契约；type 能表达联合、交叉、元组、条件类型和映射类型，适合组合复杂类型。对象类型用哪个都不会改变运行时，关键是一致。不要在同一项目里随意混用；公共 API 优先 interface，类型运算和联合类型用 type。interface 的声明合并是双刃剑，可能让同名类型被意外扩展。$md$,
 null, null, array['typescript','type','interface']),

((select id from question_category where name = 'TypeScript'), 'easy',
 'unknown 和 any 有什么区别？',
 $md$为什么处理外部输入时更推荐 unknown 而不是 any？$md$,
 $md$any 会关闭类型检查，并把这个“任意性”继续传播给调用方；unknown 表示值未知，必须先通过 typeof、instanceof、in 或类型谓词收窄后才能使用。外部 API、JSON.parse、事件对象等来源都适合先声明为 unknown，再写校验函数转成业务类型。unknown 更安全，但需要额外收窄代码；any 只应在迁移遗留代码或确实无法建模时局部使用，并尽快隔离。$md$,
 null, null, array['typescript','unknown','any','type-safety']),

((select id from question_category where name = 'TypeScript'), 'medium',
 'TypeScript 的类型收窄有哪些常见方式？',
 $md$请列举常用的类型收窄手段，并说明如何保证联合类型被完整处理。$md$,
 $md$常见方式包括 typeof、instanceof、in、相等比较、真值判断、可辨识联合的 discriminant 字段、用户自定义类型谓词和断言函数。可辨识联合配合 switch 最清晰，default 分支用 never 做穷尽检查，新增成员时编译器会报错。收窄只影响当前控制流，跨函数调用或异步回调后可能失效；复杂校验建议用 schema 库并把结果映射为业务类型，而不是大量 as 断言。$md$,
 null, null, array['typescript','narrowing','union','type-guard']),

((select id from question_category where name = 'TypeScript'), 'medium',
 '泛型约束 extends 有什么用？',
 $md$请说明泛型约束如何限制类型参数，以及它与条件类型中的 extends 有什么区别。$md$,
 $md$在类型参数上写 T extends SomeShape，表示 T 必须满足该结构，因此函数内部可以安全访问约束中的属性；keyof、Record 等约束常用于把参数限制在合法键集合内。条件类型中的 A extends B 则是判断可赋值性并分支，不是声明约束。约束过宽会失去保护，过窄会降低复用；可以配合默认类型参数和推断让调用方少写显式泛型。不要用 any 绕过约束，否则泛型只剩装饰作用。$md$,
 null, null, array['typescript','generics','constraint','conditional-types']),

((select id from question_category where name = 'TypeScript'), 'medium',
 'satisfies 解决什么问题？',
 $md$请说明 satisfies 与类型注解的区别，以及它在配置对象中的典型用法。$md$,
 $md$类型注解会把变量类型扩大为注解类型，可能丢失字面量或更窄的推断；satisfies 只校验表达式是否满足目标类型，同时保留表达式自身的精确推断。配置对象、路由表和常量映射很适合用它：既能发现拼写错误和缺失字段，又能让后续代码拿到具体的键和字面量类型。它不改变运行时行为，也不能替代运行时校验；外部数据仍需要解析和验证。$md$,
 null, null, array['typescript','satisfies','inference']),

-- 浏览器与前端工程化
((select id from question_category where name = '浏览器与前端工程化'), 'medium',
 '从输入 URL 到页面渲染发生了什么？',
 $md$请描述浏览器从地址栏输入到首屏出现的主要阶段，并指出常见性能瓶颈。$md$,
 $md$大致经过 URL 解析、DNS、TCP/TLS、HTTP 请求、HTML 解析、DOM/CSSOM 构建、渲染树、布局、绘制和合成。JS 可能阻塞 HTML 解析，CSS 会阻塞渲染，图片和字体会影响首屏；缓存、CDN、压缩、预加载和资源优先级都会改变时序。排查时用 Performance 面板看关键路径，区分网络等待、解析阻塞、长任务和渲染开销，不要只看总加载时间。$md$,
 null, null, array['browser','rendering','network','performance']),

((select id from question_category where name = '浏览器与前端工程化'), 'medium',
 '浏览器事件循环中宏任务和微任务如何调度？',
 $md$请说明一次事件循环中宏任务、微任务和渲染的先后关系，以及微任务过多会有什么影响。$md$,
 $md$事件循环每轮通常取一个宏任务执行，然后清空微任务队列，再根据时机进行样式计算、布局和绘制。Promise 回调、queueMicrotask 属于微任务；setTimeout、I/O 回调属于宏任务。微任务里继续产生微任务会在同一轮清空，可能饿死渲染和用户输入。requestAnimationFrame 在绘制前执行，适合动画；需要让出主线程时可用 scheduler 或拆分任务。$md$,
 null, null, array['browser','event-loop','microtask','macrotask']),

((select id from question_category where name = '浏览器与前端工程化'), 'easy',
 'history 路由和 hash 路由有什么区别？',
 $md$请比较两种前端路由在 URL、服务器配置和部署上的差异。$md$,
 $md$hash 路由把路径放在 # 后，浏览器不会把 fragment 发给服务器，部署简单但 URL 不够干净；history 路由使用 pushState 生成普通路径，需要服务器把所有前端路由回退到 index.html，否则刷新会 404。history 路由更接近传统 URL，便于 SEO 和分享，但需要正确配置 Nginx/网关；hash 路由适合静态托管或无法改服务器的场景。两者都要处理前进后退和滚动位置恢复。$md$,
 null, null, array['frontend','router','history','hash']),

((select id from question_category where name = '浏览器与前端工程化'), 'medium',
 'Tree Shaking 依赖哪些条件？',
 $md$为什么有些代码明明没有被使用，打包后仍然留在产物里？$md$,
 $md$Tree Shaking 依赖 ES Module 的静态导入导出、打包器的副作用分析和压缩器的死代码消除。CommonJS 的动态 require、带副作用的模块顶层代码、barrel 文件里无意的重新导出，都会让工具不敢删除。package.json 的 sideEffects 标记、按需导入和避免在模块顶层执行副作用都很重要。它主要发生在生产构建，开发模式为了调试通常不会激进删除。$md$,
 null, null, array['frontend','bundler','tree-shaking','esm']),

((select id from question_category where name = '浏览器与前端工程化'), 'medium',
 'CORS 预检请求什么时候触发？',
 $md$请说明简单请求与预检请求的判定，以及服务端需要返回哪些响应头。$md$,
 $md$跨源请求如果使用了 PUT/DELETE 等非简单方法，或带有自定义请求头、非简单 Content-Type，浏览器会先发 OPTIONS 预检。服务端要在预检响应里返回 Allow-Origin、Allow-Methods、Allow-Headers，必要时返回 Max-Age 和 Allow-Credentials；实际请求还要再次带 CORS 头。简单请求也会检查 Allow-Origin，只是不预检。带 cookie 时 Origin 不能是 *，且需要明确 Allow-Credentials。CORS 是浏览器策略，不是服务端鉴权。$md$,
 null, null, array['browser','cors','preflight','http']),

-- 性能优化
((select id from question_category where name = '性能优化'), 'medium',
 'LCP、INP、CLS 分别关注什么？',
 $md$请解释 Core Web Vitals 的三个指标，并说明各自常见的优化方向。$md$,
 $md$LCP 关注最大内容元素何时完成渲染，常见优化是图片压缩与预加载、字体、服务端响应和阻塞资源；INP 关注交互到下一次绘制的延迟，重点是减少长任务、拆分 JS、避免主线程阻塞；CLS 关注布局偏移，给图片和广告预留尺寸、避免动态插入内容。指标要用真实用户数据结合实验室数据看，不能只追求单次 Lighthouse 分数。$md$,
 null, null, array['performance','web-vitals','lcp','inp','cls']),

((select id from question_category where name = '性能优化'), 'medium',
 '前端代码分割和懒加载如何落地？',
 $md$请说明路由级、组件级和第三方依赖分割的做法，以及过度分割的风险。$md$,
 $md$路由级用动态 import + lazy/Suspense，把首屏不需要的页面拆出去；组件级对弹窗、编辑器、图表等重组件按交互懒加载；第三方依赖可通过构建工具拆 vendor chunk。配合预取可以在空闲时提前加载下一步资源。过度分割会增加请求数和瀑布流，反而拖慢首屏；应按真实访问路径和 bundle 分析结果划分，并监控加载失败与重试。$md$,
 null, null, array['performance','code-splitting','lazy-loading','bundle']),

((select id from question_category where name = '性能优化'), 'hard',
 '接口 P99 延迟高，如何定位瓶颈？',
 $md$请说明从指标、链路追踪到日志的排查顺序，以及常见的长尾原因。$md$,
 $md$先看错误率、P50/P95/P99、吞吐和饱和度，确认是整体变慢还是长尾；再用 traceId 串联网关、服务、数据库和下游，找出最慢 span。常见原因包括连接池耗尽、锁竞争、慢 SQL、N+1、序列化大对象、GC 停顿、线程池排队和下游超时。P99 高但均值正常，往往是个别请求排队或重试导致；要结合分位分布、实例维度和时间窗口，不要只看平均延迟。$md$,
 null, null, array['performance','latency','tracing','p99']),

((select id from question_category where name = '性能优化'), 'medium',
 '数据库慢查询如何优化？',
 $md$请给出从慢日志到执行计划的优化步骤，并说明索引不是越多越好。$md$,
 $md$先开慢查询日志并用 EXPLAIN ANALYZE 看实际行数、扫描方式、回表和排序；再检查索引是否覆盖过滤与排序、是否存在函数运算、隐式转换、前导模糊或最左前缀问题。可以通过联合索引、覆盖索引、分页改写、减少 N+1 和归档历史数据优化。索引会增加写入和存储成本，低选择性或很少使用的索引应删除；统计信息过期时也要及时更新。$md$,
 null, null, array['performance','database','slow-query','index']),

((select id from question_category where name = '性能优化'), 'hard',
 '缓存一致性应该如何设计？',
 $md$请说明 cache-aside 的更新顺序、失效策略，以及高并发下的常见问题。$md$,
 $md$常用 cache-aside：读时未命中查库回填，写时先更新数据库再删除缓存，并为缓存设置 TTL 兜底。删除失败可用重试、消息或延迟双删补偿；强一致要求高时不要让缓存成为唯一事实来源。还要处理热点 key、缓存击穿、雪崩和脏读，读多写少适合缓存，频繁变更的数据要评估收益。本地缓存与 Redis 组合时，要设计失效广播或版本号，避免多级缓存长期不一致。$md$,
 null, null, array['performance','cache','consistency','redis']),

-- 测试与质量
((select id from question_category where name = '测试与质量'), 'medium',
 '单元测试、集成测试和端到端测试如何分工？',
 $md$请说明三类测试的目标、成本和适用场景，以及测试金字塔的意义。$md$,
 $md$单元测试隔离业务逻辑，速度快、定位准，适合边界条件和纯函数；集成测试验证数据库、HTTP、消息等真实边界，覆盖配置和事务；端到端测试从用户视角走关键路径，成本高且容易不稳定。测试金字塔主张大量单元、适量集成、少量关键 E2E，避免把所有信心押在 UI 上。测试比例不是教条，核心链路可以增加集成覆盖。$md$,
 null, null, array['testing','unit-test','integration-test','e2e']),

((select id from question_category where name = '测试与质量'), 'medium',
 'Spring Boot 接口应该怎么测试？',
 $md$请说明 MockMvc、切片测试和完整集成测试的取舍，以及鉴权与异常响应如何覆盖。$md$,
 $md$Controller 层可用 MockMvc 做 Web 切片测试，验证路由、参数校验、鉴权和统一响应；Service 逻辑用单元测试；需要真实数据库和事务时用 @SpringBootTest 配合 Testcontainers。不要把所有依赖都 mock 掉，否则测试通过但集成仍会失败。至少覆盖未登录、无权限、参数非法、业务异常和成功路径，并断言 HTTP 状态与错误码，而不只是断言 200。$md$,
 null, null, array['testing','spring-boot','mockmvc','integration-test']),

((select id from question_category where name = '测试与质量'), 'medium',
 '前端组件测试应该断言什么？',
 $md$请说明如何写出不依赖实现细节的组件测试，并举例说明常见误区。$md$,
 $md$优先从用户可见行为断言：按角色、标签或文本找到元素，触发点击和输入，检查结果、错误提示和可访问状态；避免断言内部 state、私有方法或脆弱快照。异步更新用 findBy 或 waitFor，网络请求用 MSW 等工具在边界 mock。测试应能承受重构，只要行为不变就不应失败；过度 mock 子组件会让测试与真实集成脱节。$md$,
 null, null, array['testing','frontend','react','testing-library']),

((select id from question_category where name = '测试与质量'), 'easy',
 '为什么测试金字塔不能倒置？',
 $md$请解释大量端到端测试、少量单元测试会带来什么问题。$md$,
 $md$端到端测试启动慢、依赖环境、失败原因难定位，维护成本高且容易 flaky；如果测试大头都放在 E2E，反馈周期会变长，开发者倾向跳过或重跑。单元测试快速稳定，能精确定位逻辑错误；集成测试补边界；E2E 只覆盖少数关键用户旅程。倒置不等于 E2E 没价值，而是要用少量高价值场景换取端到端信心，不能替代底层测试。$md$,
 null, null, array['testing','test-pyramid','e2e','quality']),

((select id from question_category where name = '测试与质量'), 'medium',
 '不稳定的测试（flaky test）应该怎么处理？',
 $md$请说明 flaky test 的常见根因和治理方式，以及为什么简单加重试不够。$md$,
 $md$常见根因是时间依赖、异步等待不足、测试间共享状态、执行顺序、随机数据、网络或外部服务不稳定。治理要先隔离并记录失败率，再复现和修根因：使用假时钟、显式等待条件、每个测试独立数据、固定随机种子、在边界 mock 外部依赖。重试只能缓解症状，会掩盖真实缺陷并拖慢流水线；长期 flaky 的测试应降级或移除，直到能稳定验证行为。$md$,
 null, null, array['testing','flaky-test','ci','reliability']),

-- 架构设计
((select id from question_category where name = '架构设计'), 'hard',
 '单体、模块化单体和微服务应该怎么选？',
 $md$请从团队规模、领域边界、部署和一致性成本角度比较三种架构。$md$,
 $md$单体开发部署简单、事务一致，但边界容易腐化；模块化单体用清晰模块和依赖规则保留单体优势，适合多数中小团队；微服务让团队独立部署和扩缩容，但引入网络、分布式事务、观测和运维成本。选择看业务复杂度、团队自治需求和变更频率，不要为了技术潮流拆服务。边界没稳定前先做模块化单体，等团队和领域成熟再按限界上下文拆。$md$,
 null, null, array['architecture','monolith','modular-monolith','microservices']),

((select id from question_category where name = '架构设计'), 'hard',
 '如何设计一个高并发短链接系统？',
 $md$请说明短码生成、存储、读写路径、缓存和过期策略。$md$,
 $md$写路径生成全局唯一 ID，转 base62 得到短码，或用号段/雪花避免碰撞；读路径先查 Redis，未命中查数据库并回填，再 302 跳转。需要支持自定义别名、恶意链接检测、访问统计异步化和过期清理。热点链接要防止缓存击穿，写入要幂等，数据库按短码分片；统计不要阻塞跳转。可用布隆过滤器挡不存在的短码，但要接受误判和删除同步成本。$md$,
 null, null, array['architecture','system-design','short-url','cache']),

((select id from question_category where name = '架构设计'), 'hard',
 '如何设计一个站内通知系统？',
 $md$请说明事件接入、模板渲染、渠道发送、幂等和失败重试的设计。$md$,
 $md$业务事件先写入 outbox 或消息队列，通知服务按用户偏好和模板生成站内信，再异步发送邮件/推送。要保证幂等键、去重、重试与死信队列，发送失败可补偿；已读状态和未读数要支持分页与批量更新。高 fanout 场景按用户分片或批量写入，避免同步阻塞主业务。还要有频率限制、免打扰、审计和可观测指标，模板变更要版本化。$md$,
 null, null, array['architecture','system-design','notification','outbox']),

((select id from question_category where name = '架构设计'), 'medium',
 '灰度发布和回滚应该如何设计？',
 $md$请说明流量路由、数据库兼容、监控和自动回滚的关键点。$md$,
 $md$灰度按用户、请求头、地域或比例把流量切到新版本，网关或服务网格维护版本标签；发布前准备可观测基线和告警，发布中对比错误率、延迟和业务指标。数据库变更采用 expand-contract，保证新旧版本同时可运行；配置和功能开关要能独立关闭。异常时自动或一键回滚，保留旧实例和镜像，并验证回滚后的数据兼容性。$md$,
 null, null, array['architecture','release','canary','rollback']),

((select id from question_category where name = '架构设计'), 'medium',
 '架构评审应该重点关注什么？',
 $md$请列出一场有效架构评审需要覆盖的问题，以及常见的形式化误区。$md$,
 $md$先确认业务目标、约束和非功能需求，再评审边界与数据所有权、依赖方向、失败模式、一致性、安全、可观测性、成本和迁移回滚。要明确哪些是假设、哪些需要验证，给出权衡而不是只画组件图。常见误区是只讲技术栈、不讨论故障和运维，或把评审变成审批表演；有效评审应留下决策记录、风险和后续验证项。$md$,
 null, null, array['architecture','review','tradeoffs','quality']);
