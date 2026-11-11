-- 视频讲解模块：独立分类、视频元数据。
-- 视频文件与封面存 MinIO 私有桶，数据库只保存 object key。

create table video_category
(
    id          bigserial primary key,
    name        varchar(50) not null,
    sort        int         not null default 0,
    deleted     boolean     not null default false,
    create_time timestamptz not null default now(),
    update_time timestamptz
);

create unique index uk_video_category_name on video_category (name) where deleted = false;
create index idx_video_category_sort on video_category (sort) where deleted = false;

comment on table video_category is '视频讲解分类（独立于题目分类）';

insert into video_category (name, sort)
values ('Java 基础', 10),
       ('JVM', 20),
       ('Spring', 30),
       ('系统设计', 40);

create table video
(
    id                bigserial primary key,
    title             varchar(200) not null,
    description       text,
    speaker           varchar(100),
    category_id       bigint       not null references video_category (id),
    question_id       bigint references question (id),
    tags              text[]       not null default '{}',
    video_object_key  varchar(512),
    cover_object_key  varchar(512),
    duration_seconds  int          not null default 0,
    size_bytes        bigint       not null default 0,
    content_type      varchar(100),
    status            varchar(20)  not null default 'draft',
    published_at      timestamptz,
    deleted           boolean      not null default false,
    create_by         varchar(64),
    create_time       timestamptz  not null default now(),
    update_by         varchar(64),
    update_time       timestamptz,
    constraint ck_video_status check (status in ('draft', 'published', 'offline'))
);

create index idx_video_category on video (category_id) where deleted = false;
create index idx_video_status_published on video (status, published_at desc) where deleted = false;
create index idx_video_question on video (question_id) where deleted = false;
create index idx_video_tags on video using gin (tags);

comment on table video is '面试视频讲解；文件存 MinIO，表内只保存 object key';
comment on column video.status is 'draft 草稿 / published 已发布 / offline 已下线';
comment on column video.video_object_key is 'MinIO 对象 key，例如 videos/12/uuid.mp4';
comment on column video.cover_object_key is 'MinIO 封面 key，可空';
