-- 视频互动：评论与时间点弹幕。
-- 视频仍用 MP4 + 预签名 URL，互动数据只存元数据。

create table video_comment
(
    id          bigserial primary key,
    video_id    bigint       not null references video (id) on delete cascade,
    user_id     bigint       not null references sys_user (id),
    content     varchar(500) not null,
    deleted     boolean      not null default false,
    create_time timestamptz  not null default now(),
    update_time timestamptz
);

create index idx_video_comment_video on video_comment (video_id, create_time desc) where deleted = false;
create index idx_video_comment_user on video_comment (user_id);

comment on table video_comment is '视频评论；仅登录用户可发表，本人或管理员可删除';

create table video_danmaku
(
    id          bigserial primary key,
    video_id    bigint      not null references video (id) on delete cascade,
    user_id     bigint      not null references sys_user (id),
    content     varchar(60) not null,
    time_ms     int         not null,
    color       varchar(7)  not null default '#ffffff',
    mode        varchar(10) not null default 'scroll',
    deleted     boolean     not null default false,
    create_time timestamptz not null default now(),
    constraint ck_video_danmaku_time check (time_ms >= 0),
    constraint ck_video_danmaku_mode check (mode in ('scroll', 'top', 'bottom'))
);

create index idx_video_danmaku_video_time on video_danmaku (video_id, time_ms) where deleted = false;

comment on table video_danmaku is '视频时间点弹幕；time_ms 为视频内毫秒时间';
