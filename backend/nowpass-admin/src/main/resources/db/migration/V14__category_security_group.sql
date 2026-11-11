-- 补充安全大类，并把 Web 安全归入；修正未分组分类。

insert into question_major_category (name, sort, icon)
values ('安全与合规', 55, 'lucide:shield-check');

update question_category
set major_category_id = (select id from question_major_category where name = '安全与合规')
where name = 'Web 安全';
