# M2 数据模型说明

## 1. 当前状态

M2 已完成第一版数据库模型落地，覆盖任务清单中的 5 组核心表：

1. 用户与会话
2. 政策文件与关系
3. 政策切片
4. 记忆与事项
5. 引用与管理

## 2. 已落地表清单

当前 SQLAlchemy 元数据已包含以下表：

- `users`
- `chat_sessions`
- `chat_messages`
- `policy_documents`
- `policy_attachments`
- `policy_relations`
- `policy_versions`
- `policy_scopes`
- `policy_chunks`
- `memory_items`
- `service_cases`
- `case_slots`
- `citations`
- `standard_answers`
- `hot_questions`
- `eligibility_records`

## 3. 设计要点

### 3.1 用户与会话

- `users` 保存用户基础身份
- `chat_sessions` 保存会话
- `chat_messages` 保存多轮消息
- `current_case_id` 用于把会话挂接到当前事项

### 3.2 政策文件与关系

- `policy_documents` 是政策主表
- `policy_attachments` 表达主文件与附件关系
- `policy_relations` 表达版本替代、补充、引用等关系
- `policy_versions` 预留新旧版本管理
- `policy_scopes` 预留适用范围结构化表达

### 3.3 政策切片

- `policy_chunks` 保存条款切片
- 保留 `section_title`、`article_no`、`page_no`
- 保留 `metadata`
- 保留 `search_vector`
- 保留 `embedding`，底层使用 PostgreSQL `vector`

### 3.4 记忆与事项

- `service_cases` 表示当前办理事项
- `case_slots` 表示事项所需条件与缺失状态
- `memory_items` 表示短期、事项、长期记忆

### 3.5 引用与管理

- `citations` 表示回答引用来源
- `standard_answers` 支撑后台标准答案
- `hot_questions` 支撑热门问题统计
- `eligibility_records` 保存资格判断结果

## 4. 验证方式

### 4.1 建表

```bash
python -m app.db.init_db
```

也支持直接从 `backend` 目录执行：

```bash
python app/db/init_db.py
```

### 4.2 M2 冒烟验证

```bash
python -m app.db.m2_smoke_test
```

也支持直接从 `backend` 目录执行：

```bash
python app/db/m2_smoke_test.py
```

该脚本会：

1. 初始化数据表
2. 创建一个演示用户
3. 创建一个演示会话
4. 写入一条演示消息

用于验证 M2.1 的基本验收要求。
