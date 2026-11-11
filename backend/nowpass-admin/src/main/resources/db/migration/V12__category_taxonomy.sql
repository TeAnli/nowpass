-- 补充分类维度：先建分类，题目后续按分类补充。
-- 前台分类接口只返回已有题目的分类，避免出现大量 0 题空分类。

insert into question_category (name, sort, icon)
values ('Java 集合', 240, 'lucide:layers-3'),
       ('后端场景', 250, 'lucide:briefcase-business'),
       ('Go', 260, 'lucide:code-xml'),
       ('MyBatis', 270, 'lucide:database-zap'),
       ('Netty', 280, 'lucide:network'),
       ('C++', 290, 'lucide:code-2'),
       ('Python', 300, 'lucide:terminal'),
       ('C#', 310, 'lucide:hash'),
       ('PHP', 320, 'lucide:file-code-2'),
       ('MongoDB', 330, 'lucide:leaf'),
       ('JavaScript', 340, 'lucide:braces'),
       ('Vue', 350, 'lucide:triangle'),
       ('Git', 360, 'lucide:git-branch'),
       ('Nginx', 370, 'lucide:server'),
       ('DevOps', 380, 'lucide:infinity'),
       ('AI 应用开发', 390, 'lucide:brain-circuit'),
       ('AI Agent', 400, 'lucide:bot'),
       ('前端手写代码', 410, 'lucide:square-code'),
       ('前端代码分析', 420, 'lucide:scan-search'),
       ('系统运维', 430, 'lucide:server-cog');
