# 题库内容与选题规范

## 1. 为什么不直接复制第三方站点

面试题本身可能简短，但题干组织、答案解释和配图通常受版权保护，直接抓取还容易带入：

- 过时或错误的技术结论
- 重复题目和低质量洗稿
- 站点条款禁止的转载内容
- 无法追溯来源的答案

因此本项目采用“公开常见考点 + 重新撰写”的方式扩充题库，不复制第三方原文。

## 2. 本次新增题目

V9 迁移新增 10 道原创题，覆盖当前题量较少的分类：

| ID | 分类 | 难度 | 题目 |
|---|---|---|---|
| 51 | Java 基础 | medium | Java 泛型擦除会带来哪些限制？ |
| 52 | Java 基础 | easy | Java 的受检异常和运行时异常应该怎么选？ |
| 53 | JVM | medium | JVM 类加载过程与双亲委派机制 |
| 54 | 数据库 | medium | MySQL 索引失效的常见场景有哪些？ |
| 55 | 数据库 | hard | 分库分表后分页、事务和全局 ID 怎么处理？ |
| 56 | 计算机网络 | medium | HTTP 强缓存和协商缓存如何配合？ |
| 57 | Kotlin | medium | Kotlin 挂起函数和阻塞线程有什么区别？ |
| 58 | Spring | medium | Spring 声明式事务为什么会失效？ |
| 59 | 并发编程 | medium | CAS 的 ABA 问题是什么？如何解决？ |
| 60 | Java 基础 | medium | Java 的强、软、弱、虚引用分别适合什么场景？ |

## 3. 新增题目的格式

题库使用 Markdown 字段，题目和答案分别写入 `content_md`、`answer_md`。简答题的 `options` 和 `answer_key` 为 `null`。

```sql
insert into question
    (category_id, difficulty, title, content_md, answer_md, options, answer_key, tags)
values
    ((select id from question_category where name = 'Java 基础'),
     'medium',
     '题目',
     $md$题干 Markdown$md$,
     $md$标准答案 Markdown$md$,
     null, null,
     array['java', 'topic']);
```

约定：

- `difficulty` 只能是 `easy`、`medium`、`hard`
- `tags` 用小写英文，便于筛选
- 答案要说明取舍和边界，不只给结论
- 涉及版本差异时写清适用版本
- 不在题干或答案中复制第三方大段原文

## 4. 验证

```bash
docker logs nowpass-backend 2>&1 | grep -E 'Migrating|Successfully applied'
docker exec nowpass-postgres psql -U nowpass -d nowpass \
  -c "select count(*) from question where deleted=false;"
```

当前结果：`60` 道题，V9 迁移成功。

## 5. 如果以后要导入外部题库

只有满足以下条件才建议导入：

- 明确允许转载的许可证，或已获得作者授权
- 保留来源、作者、许可证和原始链接
- 能接受定期校对过期内容
- 导入前去重，并人工审核答案正确性

当前表结构没有来源字段；真要接外部题库，应先增加 `source_name`、`source_url`、`license` 等字段，再做导入。
