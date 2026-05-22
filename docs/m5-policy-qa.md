# M5 政策智能问答说明

## 1. 当前状态

M5 已完成政策智能问答最小闭环：

- 接收用户问题
- 创建或复用会话
- 调用 M4 RAG 检索
- 调用统一 LLM Provider
- 返回政策依据、AI 推断和引用出处
- 保存用户消息与助手消息
- 保存 citations 引用记录
- 更新 hot_questions 热门问题
- 前端 `/chat` 已接入真实接口

默认使用 `mock` LLM provider，因此没有外部 API Key 时也能演示完整流程。

## 2. 后端接口

```text
POST /api/chat
```

请求示例：

```json
{
  "question": "校外做毕业论文需要什么申请表？",
  "session_id": null,
  "top_k": 5,
  "include_expired": true
}
```

响应包含：

- `answer`
- `policy_basis`
- `ai_inference`
- `citations`
- `retrieved_chunks`
- `session_id`
- `user_message_id`
- `assistant_message_id`

## 3. LLM Provider

当前实现：

- `mock`：基于 RAG 检索片段生成结构化回答
- `http`：预留 OpenAI-compatible 或自定义 HTTP 模型服务

环境变量：

```text
LLM_PROVIDER=mock
LLM_MODEL=mock-policy-qa-v1
LLM_API_URL=
LLM_API_KEY=
```

## 4. Prompt 约束

Prompt 文档：

```text
backend/app/prompts/policy_qa.md
```

核心要求：

- 基于政策片段回答
- 展示政策依据
- 展示 AI 推断
- 不确定时明确说明
- 回答不能脱离引用片段

## 5. 数据写入

每次问答会写入：

- `chat_sessions`
- `chat_messages`
- `citations`
- `hot_questions`

其中 citations 会保存：

- `message_id`
- `document_id`
- `chunk_id`
- `attachment_id`
- `page_no`
- `article_no`
- `quote_text`

## 6. 前端入口

```text
http://127.0.0.1:3000/chat
```

页面支持：

- 示例问题
- 聊天式输入
- 加载状态
- 错误状态
- 政策依据卡片
- AI 推断卡片
- 可展开引用出处

## 7. 验证方式

```bash
python app/db/m5_smoke_test.py
```

已验证问题：

```text
校外做毕业论文需要什么申请表？
```

当前可命中：

- `xidian_undergraduate_thesis_regulation_revised.pdf`
- 第 13 页
- 校外做毕业设计（论文）申请表（附件9）
