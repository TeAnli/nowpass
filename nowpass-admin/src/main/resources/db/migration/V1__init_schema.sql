-- NowPass 初始表结构
-- 约定：
--   1. 主键统一 bigserial（Exposed 的 long().autoIncrement() 对应 BIGSERIAL）
--   2. 逻辑删除统一 deleted boolean，唯一约束用「部分唯一索引」规避软删冲突
--   3. 时间统一 timestamptz
--   4. PG 专有类型：question.options jsonb / question.tags text[]

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- 用户
create table sys_user
(
    id          bigserial primary key,
    username    varchar(30)  not null,
    password    varchar(100) not null, -- BCrypt
    nickname    varchar(30)  not null,
    email       varchar(100) not null,
    status      varchar(10)  not null default 'pending',
    remark      varchar(500),
    create_by   varchar(64),
    create_time timestamptz  not null default now(),
    update_by   varchar(64),
    update_time timestamptz,
    deleted     boolean      not null default false,
    constraint ck_sys_user_status check (status in ('pending', 'active', 'disabled'))
);

create unique index uk_sys_user_username on sys_user (username) where deleted = false;
create unique index uk_sys_user_email on sys_user (email) where deleted = false;
create index idx_sys_user_status on sys_user (status) where deleted = false;

comment on table sys_user is '用户表（前台用户与管理员共用一张表，靠角色区分）';
comment on column sys_user.status is 'pending 待审批 / active 正常 / disabled 停用';

-- ---------------------------------------------------------------- 角色
create table sys_role
(
    id          bigserial primary key,
    role_key    varchar(50) not null,
    role_name   varchar(50) not null,
    sort        int         not null default 0,
    create_time timestamptz not null default now(),
    deleted     boolean     not null default false
);

create unique index uk_sys_role_key on sys_role (role_key) where deleted = false;

comment on table sys_role is '角色表（角色固定三个，由 Flyway 初始化，不提供角色管理界面）';

create table sys_user_role
(
    user_id bigint not null references sys_user (id),
    role_id bigint not null references sys_role (id),
    primary key (user_id, role_id)
);

create index idx_sys_user_role_role on sys_user_role (role_id);

-- ---------------------------------------------------------------- 题目分类
create table question_category
(
    id          bigserial primary key,
    name        varchar(50) not null,
    sort        int         not null default 0,
    deleted     boolean     not null default false,
    create_time timestamptz not null default now(),
    update_time timestamptz
);

create unique index uk_question_category_name on question_category (name) where deleted = false;

comment on table question_category is '题目分类（单层，不做树形）';

-- ---------------------------------------------------------------- 题目
create table question
(
    id          bigserial primary key,
    category_id bigint       not null references question_category (id),
    difficulty  varchar(10)  not null default 'easy',
    title       varchar(200) not null,
    content_md  text         not null,
    answer_md   text         not null,
    options     jsonb,       -- [{"key":"A","text":"..."}]；简答题为 null
    answer_key  varchar(20), -- 选择题 'B' / 'AC'；简答题为 null
    tags        text[]       not null default '{}',
    deleted     boolean      not null default false,
    create_by   varchar(64),
    create_time timestamptz  not null default now(),
    update_by   varchar(64),
    update_time timestamptz,
    constraint ck_question_difficulty check (difficulty in ('easy', 'medium', 'hard'))
);

create index idx_question_category on question (category_id) where deleted = false;
create index idx_question_difficulty on question (difficulty) where deleted = false;
create index idx_question_tags on question using gin (tags);
create index idx_question_title_trgm on question using gin (title gin_trgm_ops);

comment on table question is '面试题（含标准答案，答案走独立接口返回）';
comment on column question.options is '选择题选项，jsonb 数组；简答题为 null';
comment on column question.answer_key is '选择题标准答案键；简答题为 null';

-- ---------------------------------------------------------------- 操作日志
create table sys_oper_log
(
    id             bigserial primary key,
    title          varchar(50)  not null,
    business_type  varchar(20)  not null,
    method         varchar(200),
    request_method varchar(10),
    oper_name      varchar(64),
    oper_url       varchar(255),
    oper_ip        varchar(64),
    oper_param     text,
    json_result    text,
    status         varchar(10)  not null,
    error_msg      text,
    cost_time      bigint,
    oper_time      timestamptz  not null default now()
);

create index idx_sys_oper_log_time on sys_oper_log (oper_time desc);
create index idx_sys_oper_log_oper_name on sys_oper_log (oper_name);

comment on table sys_oper_log is '操作日志（只记录管理端写操作，不存业务数据）';
