-- 分类图标：存 Iconify 图标名，例如 logos:java / lucide:database
alter table question_category
    add column icon varchar(64);

update question_category
set icon = case name
    when 'Java 基础' then 'logos:java'
    when 'JVM' then 'logos:java'
    when '数据库' then 'logos:postgresql'
    when '计算机网络' then 'lucide:network'
    when 'Kotlin' then 'logos:kotlin-icon'
    when 'Spring' then 'logos:spring-icon'
    else 'lucide:layers'
end
where deleted = false;

comment on column question_category.icon is 'Iconify 图标名，可由后台分类管理修改';
