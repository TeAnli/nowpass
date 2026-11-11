-- QQ OAuth 身份表。一个用户可绑定多个第三方身份，当前先支持 QQ。
create table user_oauth
(
    id               bigserial primary key,
    user_id          bigint       not null references sys_user (id),
    provider         varchar(20)  not null,
    provider_user_id varchar(100) not null,
    union_id         varchar(100),
    nickname         varchar(100),
    avatar_url       varchar(500),
    last_login_at    timestamptz,
    create_time      timestamptz  not null default now()
);

create unique index uk_user_oauth_provider_user on user_oauth (provider, provider_user_id);
create index idx_user_oauth_user on user_oauth (user_id);

comment on table user_oauth is '第三方登录身份；provider_user_id 对 QQ 是 openid';
