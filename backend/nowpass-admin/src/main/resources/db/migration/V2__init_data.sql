-- NowPass 初始化数据
-- 说明：管理员账号不在此处插入（BCrypt 哈希写死在 SQL 里难以维护），
--       由启动时的 DataInitializer 幂等创建，见 docs/03-database.md

-- ---------------------------------------------------------------- 角色（固定三个）
insert into sys_role (role_key, role_name, sort)
values ('superadmin', '超级管理员', 1),
       ('admin', '管理员', 2),
       ('user', '普通用户', 3);

-- ---------------------------------------------------------------- 题目分类
insert into question_category (name, sort)
values ('Java 基础', 10),
       ('JVM', 20),
       ('数据库', 30),
       ('计算机网络', 40),
       ('Kotlin', 50),
       ('Spring', 60);

-- ---------------------------------------------------------------- 示例题目
-- 文本用 $md$ 美元引用，避免引号转义；options 用 jsonb 数组

insert into question (category_id, difficulty, title, content_md, answer_md, options, answer_key, tags)
values
-- 1. 简答题
((select id from question_category where name = 'Java 基础'),
 'easy',
 '== 和 equals() 的区别是什么？',
 $md$请说明 Java 中 `==` 与 `equals()` 的区别，以及为什么重写 `equals()` 时必须同时重写 `hashCode()`。$md$,
 $md$`==` 比较的是**引用**（基本类型比较值，引用类型比较是否为同一个对象），`equals()` 默认实现也是 `==`，但可以被重写为**逻辑相等**。

必须同时重写 `hashCode()` 的原因：`HashMap`/`HashSet` 先用 `hashCode()` 定位桶，再用 `equals()` 比较。若只重写 `equals()`，两个"逻辑相等"的对象哈希不同，会落到不同桶，导致 `set.contains(obj)` 返回 false、`map.get(key)` 取不到值，破坏集合契约。$md$,
 null, null, array['java', 'equals', 'hashcode']),

-- 2. 单选题
((select id from question_category where name = 'Java 基础'),
 'easy',
 'String 在 Java 中是基本数据类型吗？',
 $md$关于 `String`，下列说法正确的是？$md$,
 $md$**B**。`String` 是引用类型（`java.lang.String` 类），Java 只有 8 种基本类型：`byte/short/int/long/float/double/char/boolean`。

补充：`String` 对象不可变，字符串字面量存放在常量池，因此 `"a" + "b"` 在编译期即可合并，而运行时拼接会创建新对象（循环拼接应使用 `StringBuilder`）。$md$,
 $md$[{"key":"A","text":"是，属于基本类型"},{"key":"B","text":"不是，它是引用类型且不可变"},{"key":"C","text":"不是，它是可变字符数组"},{"key":"D","text":"取决于编译器的优化"}]$md$::jsonb,
 'B', array['java', 'string']),

-- 3. 多选题
((select id from question_category where name = 'Java 基础'),
 'medium',
 '关于 HashMap 的说法，正确的有哪些？',
 $md$选出所有正确项。$md$,
 $md$**A、C**。

- A 正确：默认初始容量 16，负载因子 0.75，元素数超过 `容量 × 0.75` 时扩容为 2 倍。
- B 错误：JDK 8 起当链表长度 ≥ 8 且容量 ≥ 64 时链表转红黑树，**不是**无条件转树。
- C 正确：`HashMap` 非线程安全，多线程并发扩容可能导致数据丢失或死循环（JDK 8 已缓解成环问题，但仍不安全），并发场景用 `ConcurrentHashMap`。
- D 错误：允许一个 `null` 键和多个 `null` 值。$md$,
 $md$[{"key":"A","text":"默认初始容量 16，负载因子 0.75"},{"key":"B","text":"链表长度超过 8 一定转为红黑树"},{"key":"C","text":"多线程并发写入可能导致数据丢失"},{"key":"D","text":"不允许 null 键"}]$md$::jsonb,
 'AC', array['java', 'hashmap', '集合']),

-- 4. 简答题
((select id from question_category where name = 'JVM'),
 'medium',
 '线上服务出现 OOM，你会如何排查？',
 $md$描述一次内存溢出问题的排查思路与常用命令。$md$,
 $md$**先分类再定位**：

1. **看是哪种 OOM**：`Java heap space`（堆）、`Metaspace`（元空间/类太多）、`unable to create new native thread`（线程数超限）、`GC overhead limit exceeded`。
2. **保留现场**：启动参数加 `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/path`，或 `jmap -dump:live,format=b,file=heap.hprof <pid>`。
3. **看 GC 情况**：`jstat -gcutil <pid> 1000` 看老年代占用、Full GC 频率与耗时。
4. **分析堆**：MAT 或 VisualVM 打开 hprof，看 Dominator Tree 找占用最大的对象，结合业务代码定位泄漏点（常见：静态集合无限制增长、ThreadLocal 未 remove、连接/流未关闭）。
5. **线程问题**：`jstack <pid>` 或 `jcmd <pid> Thread.print` 看是否线程泄漏。
6. **给出修复并加护栏**：限制缓存大小、加上限、补监控告警。$md$,
 null, null, array['jvm', 'troubleshooting', 'oom']),

-- 5. 简答题
((select id from question_category where name = '数据库'),
 'medium',
 '为什么 MySQL 的 InnoDB 索引使用 B+ 树而不是 B 树或哈希？',
 $md$从查询效率、范围查询、磁盘 IO 三个角度说明。$md$,
 $md$**B+ 树**：非叶子节点只存键、不存数据，因此单页能容纳更多键 → 树更矮 → 磁盘 IO 次数更少（3~4 层可支撑千万级数据）。

**相比 B 树**：B 树每个节点都存数据，扇出小、树更高；且 B+ 树所有数据都在叶子节点并用链表相连，**范围查询**（`between`、`order by`）可以顺序扫描叶子链表，B 树则需要中序遍历回溯。

**相比哈希**：哈希索引只支持等值查询，不支持范围、排序、最左前缀匹配；且哈希冲突严重时退化。

代价：B+ 树插入可能引发页分裂，写入性能不如哈希；但对 OLTP 的读多写少场景总体最优。$md$,
 null, null, array['mysql', '索引', 'innodb']),

-- 6. 简答题
((select id from question_category where name = '数据库'),
 'hard',
 'InnoDB 的四种事务隔离级别分别解决了什么问题？幻读是如何被解决的？',
 $md$说明各级别与 MVCC、间隙锁的关系。$md$,
 $md$| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
| --- | --- | --- | --- |
| READ UNCOMMITTED | 可能 | 可能 | 可能 |
| READ COMMITTED | 解决 | 可能 | 可能 |
| REPEATABLE READ（InnoDB 默认） | 解决 | 解决 | 快照读下解决 |
| SERIALIZABLE | 解决 | 解决 | 解决 |

**关键点**：SQL 标准里 RR 并不能防幻读，但 InnoDB 通过 **MVCC 快照读** + **Next-Key Lock（记录锁 + 间隙锁）** 在 RR 下基本消除了幻读：
- 快照读（普通 `select`）：读的是事务开始时的 ReadView，天然看不到新插入的行。
- 当前读（`select ... for update`、`update`、`delete`）：用 Next-Key Lock 锁住范围，阻止其他事务在区间内插入。

RC 级别下每次语句都生成新 ReadView，且不使用间隙锁，因此仍有幻读。$md$,
 null, null, array['mysql', '事务', 'mvcc']),

-- 7. 简答题
((select id from question_category where name = '计算机网络'),
 'easy',
 'TCP 三次握手为什么不能是两次？',
 $md$说明两次握手会带来什么问题。$md$,
 $md$核心目的是**双方都确认对方的收发能力正常，并同步初始序列号**。

两次握手的问题：
1. **历史连接**：客户端一个早已失效的旧 SYN 延迟到达，服务端两次握手就直接建立连接并分配资源，而客户端并不会使用它 → 资源被白白占用。
2. **服务端无法确认客户端接收能力**：服务端发出 SYN+ACK 后，只有收到客户端的 ACK 才能确认"客户端能收到我的报文"。
3. **序列号未双向同步**：TCP 是全双工，两个方向都需要各自的初始序列号被确认。

四次则可以，但没必要：服务端的 ACK 与 SYN 可以合并成一个报文，所以三次是最小值。$md$,
 null, null, array['tcp', '网络']),

-- 8. 简答题
((select id from question_category where name = 'Kotlin'),
 'medium',
 'Kotlin 的 data class 与普通类有什么区别？有什么限制？',
 $md$说明编译器为 data class 生成了什么，以及它不能被继承等限制。$md$,
 $md$编译器为 `data class` 自动生成：
- `equals()` / `hashCode()`（基于主构造器中的属性）
- `toString()`（形如 `User(id=1, name="a")`）
- `copy()`（浅拷贝，可配合命名参数局部修改）
- `componentN()`（用于解构声明 `val (id, name) = user`）

限制：
- 主构造器至少有一个参数，且参数必须为 `val`/`var`；
- 不能是 `abstract`/`open`/`sealed`/`inner`（因为要生成 final 的 `copy` 等）；
- 只有主构造器里的属性参与 `equals/hashCode/toString`，类体中的属性不参与。

注意：`copy()` 是浅拷贝，嵌套可变对象仍共享引用；`data class` 的 `hashCode` 在对象被放进 `HashSet` 后修改属性会导致"查不到"。$md$,
 null, null, array['kotlin', '语法']),

-- 9. 简答题
((select id from question_category where name = 'Spring'),
 'medium',
 'Spring 如何解决单例 Bean 的循环依赖？哪些情况解决不了？',
 $md$说明三级缓存的作用与失效场景。$md$,
 $md$Spring 通过**三级缓存**解决**单例 + 字段/setter 注入**的循环依赖：

1. `singletonObjects`（一级）：成品 Bean。
2. `earlySingletonObjects`（二级）：提前暴露的早期引用（未填充属性）。
3. `singletonFactories`（三级）：`ObjectFactory`，用于在需要时生成早期引用（若存在 AOP 代理，这里返回的是代理对象）。

流程：A 实例化后先把 `ObjectFactory` 放入三级缓存 → 填充属性时发现依赖 B → 创建 B → B 依赖 A 时从三级缓存拿到 A 的早期引用 → B 完成 → A 完成。

**解决不了的情况**：
- 原型（prototype）Bean 的循环依赖（直接抛异常）；
- 构造器注入的循环依赖（对象还没实例化，无法提前暴露）——可用 `@Lazy` 打破；
- `@Async` 等代理在 BeanPostProcessor 之后才生成时的极端场景。

Spring Boot 2.6+ 默认禁止循环依赖（`spring.main.allow-circular-references=false`），应优先重构依赖关系而不是靠三级缓存兜底。$md$,
 null, null, array['spring', 'ioc', '循环依赖']);
