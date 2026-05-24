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
- 热门问题乱码过滤，避免编码异常或纯问号测试数据进入榜单
- 基础数据看板
- `/admin` 二级 Tab 信息架构：总览工作台、政策知识库、问答运营、Agent 治理、系统配置
- 系统配置页展示后端运行时实际模型服务配置，包括 provider、model、API 地址、脱敏 API Key、最大输出、超时时间和 Thinking 配置；支持运行时热更新，并内置 Codex 本地模型与 GLM-4.6 预设切换

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
GET /api/management/system-config
PATCH /api/management/system-config/model-service
```

说明：

- 热门问题写入前会过滤明显乱码、纯问号或缺少有效字符的问题
- 热门问题列表接口会再次过滤历史脏数据，保证看板只展示可读问题

## 3. 前端页面

### `/admin`

模块：

- 总览工作台：基础指标、知识库概况、问答运营概况、Agent 治理概况
- 政策知识库：政策文件上传、文件列表与解析状态、操作列内联 metadata 编辑、文件启用/禁用、启用状态筛选与每页 10 条分页
- 问答运营：热门问题列表、标准答案维护
- Agent 治理：多 Agent 编排图与编排详情左右联动、节点统计、运行观测中心、最近运行选择、运行详情时间线
- 系统配置：当前实际使用模型、OpenAI-compatible 服务地址、脱敏密钥状态、RAG 向量表、Embedding 配置、LangGraph 节点/边数量、模型预设切换和运行时热更新表单

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

说明：

- `high_risk_answer_count` 在前端展示为“需人工复核/复核预警”，表示政策回答涉及处分、推免、毕业等高影响事项，或存在证据不足、条件缺失等情况，需要人工确认最终口径。

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
