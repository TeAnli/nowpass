-- 用户学习数据：收藏、刷题记录、AI 面试历史。
-- 这三张表是后续错题本、学习统计、会员权益的基础。

create table user_favorite
(
    user_id     bigint      not null references sys_user (id),
    question_id bigint      not null references question (id),
    create_time timestamptz not null default now(),
    primary key (user_id, question_id)
);

create index idx_user_favorite_question on user_favorite (question_id);
create index idx_user_favorite_user_time on user_favorite (user_id, create_time desc);

comment on table user_favorite is '用户收藏的题目；同一用户同一题只保留一行';

create table user_question_progress
(
    user_id          bigint      not null references sys_user (id),
    question_id      bigint      not null references question (id),
    view_count       int         not null default 0,
    answer_revealed  boolean     not null default false,
    self_rating      varchar(10),
    last_view_at     timestamptz not null default now(),
    create_time      timestamptz not null default now(),
    primary key (user_id, question_id),
    constraint ck_progress_rating check (self_rating is null or self_rating in ('known', 'unsure', 'unknown'))
);

create index idx_progress_user_time on user_question_progress (user_id, last_view_at desc);
create index idx_progress_question on user_question_progress (question_id);

comment on table user_question_progress is '刷题记录：看过、是否揭晓答案、自评掌握度';
comment on column user_question_progress.self_rating is 'known 会 / unsure 模糊 / unknown 不会';

create table interview_session
(
    id             bigserial primary key,
    user_id        bigint       not null references sys_user (id),
    question_id    bigint       not null references question (id),
    question_title varchar(200) not null,
    provider       varchar(20),
    message_count  int          not null default 0,
    started_at     timestamptz  not null default now(),
    ended_at       timestamptz,
    report_md      text
);

create index idx_interview_session_user on interview_session (user_id, started_at desc);
create index idx_interview_session_question on interview_session (question_id);

comment on table interview_session is 'AI 面试场次；结束点评写入 report_md';

create table interview_message
(
    id          bigserial primary key,
    session_id  bigint      not null references interview_session (id) on delete cascade,
    role        varchar(20) not null,
    content     text        not null,
    create_time timestamptz not null default now(),
    constraint ck_interview_message_role check (role in ('user', 'assistant'))
);

create index idx_interview_message_session on interview_message (session_id, id);

comment on table interview_message is '面试对话消息，按 id 升序还原对话';
