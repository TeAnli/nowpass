-- 题目浏览量：用于“热门面试题”排序与题库列表展示。
alter table question
    add column view_count bigint not null default 0;

create index idx_question_hot on question (view_count desc, id desc) where deleted = false;

comment on column question.view_count is '题目详情浏览次数，用于热门排序，不参与业务权限判断';
