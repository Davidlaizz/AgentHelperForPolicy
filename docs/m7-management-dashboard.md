# M7 管理后台与看板说明

## 1. 当前状态

M7 已完成管理后台与知识库核查的最小闭环。

已实现：

- 政策文件管理
- 文件 metadata 编辑
- 文件软禁用
- 文件重新解析
- 政策条款 chunk 查看
- 条款关键词搜索
- 标准答案创建、列表、停用
- 热门问题看板
- 基础数据看板

## 2. 后端接口

### 政策文件

```text
GET /api/documents
PATCH /api/documents/{document_id}
DELETE /api/documents/{document_id}
POST /api/documents/{document_id}/parse
```

说明：

- `PATCH` 用于更新 metadata 和启用状态
- `DELETE` 当前为软禁用，将 `is_active` 置为 `false`

### 管理后台

```text
GET /api/management/dashboard
GET /api/management/hot-questions
GET /api/management/policy-chunks
GET /api/management/standard-answers
POST /api/management/standard-answers
PATCH /api/management/standard-answers/{answer_id}
DELETE /api/management/standard-answers/{answer_id}
```

## 3. 前端页面

### `/admin`

模块：

- 基础指标：政策文件、已解析文件、知识切片、今日问答、高风险回答、标准答案
- 政策文件上传
- 文件列表与解析状态
- metadata 编辑
- 文件软禁用
- 热门问题列表
- 标准答案维护

### `/policies`

模块：

- 政策文件列表
- 当前文件 metadata 摘要
- 条款 chunk 列表
- 条款正文搜索
- 页码、条款号、章节、来源文件展示

## 4. 数据看板指标

当前指标：

```text
document_count
active_document_count
parsed_document_count
chunk_count
today_question_count
hot_question_count
standard_answer_count
high_risk_answer_count
service_case_count
memory_item_count
top_policy_categories
top_case_types
```

## 5. 验证方式

```bash
cd backend
python -m compileall app
python app/db/m7_smoke_test.py

cd ../frontend
npm run lint
npm run build
```

M7 smoke test 覆盖：

- `/api/management/dashboard`
- `/api/management/hot-questions`
- 标准答案创建与停用
- `/api/management/policy-chunks`
