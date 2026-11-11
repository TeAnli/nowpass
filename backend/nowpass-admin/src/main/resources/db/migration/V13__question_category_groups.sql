-- 分类两层化：先收敛为 11 个大类，再把现有分类归入大类。
-- 不逐个添加站点的细分标签，避免大量 0 题分类。

create table question_major_category
(
    id          bigserial primary key,
    name        varchar(50) not null,
    sort        int         not null default 0,
    icon        varchar(100),
    deleted     boolean     not null default false,
    create_time timestamptz not null default now(),
    update_time timestamptz
);

create unique index uk_question_major_category_name on question_major_category (name) where deleted = false;
create index idx_question_major_category_sort on question_major_category (sort) where deleted = false;

comment on table question_major_category is '题库大类；分类归属大类，前台按大类分组';

insert into question_major_category (name, sort, icon)
values ('编程语言', 10, 'lucide:code-2'),
       ('框架与中间件', 20, 'lucide:boxes'),
       ('数据库与存储', 30, 'lucide:database'),
       ('分布式与微服务', 40, 'lucide:share-2'),
       ('系统、网络与运维', 50, 'lucide:server-cog'),
       ('前端', 60, 'lucide:monitor-smartphone'),
       ('算法与数据结构', 70, 'lucide:binary'),
       ('测试与工程质量', 80, 'lucide:flask-conical'),
       ('架构与场景设计', 90, 'lucide:layout-template'),
       ('AI 与大模型', 100, 'lucide:brain-circuit'),
       ('求职与软技能', 110, 'lucide:users-round');

alter table question_category
    add column major_category_id bigint references question_major_category (id);

create index idx_question_category_major on question_category (major_category_id) where deleted = false;

update question_category
set major_category_id = (select id from question_major_category where name = '编程语言')
where name in ('Java 基础', 'JVM', 'Kotlin', '并发编程', 'Java 集合', 'Go', 'C++', 'Python', 'C#', 'PHP', 'JavaScript');

update question_category
set major_category_id = (select id from question_major_category where name = '框架与中间件')
where name in ('Spring', 'MyBatis', 'Netty', '消息队列', 'Nginx');

update question_category
set major_category_id = (select id from question_major_category where name = '数据库与存储')
where name in ('数据库', 'Redis', 'MongoDB');

update question_category
set major_category_id = (select id from question_major_category where name = '分布式与微服务')
where name in ('分布式系统', '微服务', '容器与云原生');

update question_category
set major_category_id = (select id from question_major_category where name = '系统、网络与运维')
where name in ('计算机网络', '操作系统', 'Linux', '系统运维', 'DevOps');

update question_category
set major_category_id = (select id from question_major_category where name = '前端')
where name in ('React', 'TypeScript', '浏览器与前端工程化', 'JavaScript', 'Vue', '前端手写代码', '前端代码分析');

update question_category
set major_category_id = (select id from question_major_category where name = '算法与数据结构')
where name in ('数据结构与算法');

update question_category
set major_category_id = (select id from question_major_category where name = '测试与工程质量')
where name in ('测试与质量', '性能优化', 'Git');

update question_category
set major_category_id = (select id from question_major_category where name = '架构与场景设计')
where name in ('架构设计', '设计模式', '后端场景');

update question_category
set major_category_id = (select id from question_major_category where name = 'AI 与大模型')
where name in ('AI 应用开发', 'AI Agent');
