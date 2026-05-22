# M4 LlamaIndex RAG 知识库构建整理

## 1. 调整结论

M4 已调整并迁移为 **LlamaIndex RAG 知识库构建**。

新的原则是：

- LlamaIndex 负责 RAG 框架能力
- 智策通负责政策业务规则
- PostgreSQL + pgvector 继续作为向量存储
- `policy_chunks` 继续作为业务 chunk 与引用定位的主数据
- LlamaIndex Node metadata 必须能回指 `policy_chunks.id`
- LlamaIndex 向量索引使用独立 pgvector 表，`policy_chunks` 保持业务 chunk 与引用定位职责

## 2. 职责边界

### 2.1 LlamaIndex 负责

- `Document` / `TextNode` 表达
- embedding provider 接入
- `VectorStoreIndex` 构建
- PostgreSQL + pgvector vector store 适配
- metadata filters
- 基础向量 retriever

### 2.2 智策通负责

- 从 M3 解析结果生成政策语义 chunk
- 注入政策层级、类别、学院、适用范围、有效期等 metadata
- 维护主文件与附件关系
- 关键词检索
- 混合检索融合排序
- 有效时间过滤
- 出处引用与数据库回查

## 3. 推荐目录结构

```text
backend/app/services/rag/
  __init__.py
  chunker.py
  indexer.py
  retriever.py
  llama_index_adapter.py
  metadata_filter.py
  relation_resolver.py
  fusion.py
```

约束：

- 只有 `llama_index_adapter.py` 直接导入 LlamaIndex。
- `indexer.py` 和 `retriever.py` 只调用 adapter。
- 业务过滤、附件关系、融合排序不要写进 adapter。

## 4. 数据流

```text
M3 解析文本
→ M4 政策语义切片
→ policy_chunks
→ LlamaIndex TextNode
→ PostgreSQL + pgvector
→ LlamaIndex retriever
→ PostgreSQL 关键词检索
→ 业务过滤与融合排序
→ RetrievedChunk
```

## 5. Node metadata 标准

每个 LlamaIndex Node 必须包含以下 metadata：

- `document_id`
- `chunk_id`
- `attachment_id`
- `policy_level`
- `policy_category`
- `applicable_scope`
- `college`
- `effective_from`
- `effective_to`
- `parent_document_id`
- `attachment_title`
- `page_no`
- `article_no`

其中 `chunk_id` 是后续引用、数据库回查和答案出处展示的核心字段。

## 6. M4 子任务

### M4.0 依赖与边界

- 已安装并记录 LlamaIndex 核心与 PostgreSQL vector store 依赖。
- 已建立 `services/rag/` 目录。
- 已创建 `llama_index_adapter.py`。
- 旧手写 pgvector 检索逻辑已迁移为关键词、融合排序和附件关系业务层。

### M4.1 政策语义切片

- 基于 M3 解析文本重新切片。
- 控制 chunk 长度。
- 保留页码、章节、条款和附件信息。
- 写入 `policy_chunks`。

### M4.2 LlamaIndex Node 构建

- 将 `policy_chunks` 转换为 `TextNode`。
- 注入标准 metadata。
- Node 必须能回指数据库 chunk。

### M4.3 向量索引构建

- 使用 LlamaIndex `VectorStoreIndex`。
- 使用 PostgreSQL + pgvector。
- 支持全量重建和单文件重建。
- 索引完成后更新 `policy_documents.parse_status = indexed`。

### M4.4 向量检索

- 使用 LlamaIndex retriever。
- 支持 metadata filters。
- 输出内部统一 `RetrievedChunk`。

### M4.5 关键词检索

- 使用 PostgreSQL 全文检索或关键词匹配。
- 与向量检索输出同构结果。

### M4.6 混合检索

- 合并向量检索和关键词检索。
- 去重。
- 叠加权威性、时效性、附件关系加权。

### M4.7 政策业务过滤

- 按政策层级过滤。
- 按学院和适用范围过滤。
- 按有效时间过滤。
- 支持历史日期查询。

### M4.8 附件关联召回

- 主文件召回时可补充附件。
- 附件召回时可追溯主文件。
- 引用中展示附件标题。

### M4.9 RAG API

```text
POST /api/rag/index/rebuild
POST /api/rag/index/documents/{document_id}
GET  /api/rag/search
POST /api/rag/search
```

### M4.10 检索测试集

- 至少 20 条测试问题。
- 标注期望命中文件。
- 统计 top-3 命中率。
- 记录失败样例。

## 7. 迁移结果

之前工作区存在一批 RAG 草稿文件，核心思路是手写 embedding、手写 pgvector 检索和手写混合排序。

本次迁移结果：

- `rag_chunker.py` 的切片规则已迁移为 `services/rag/chunker.py`
- `embedding_provider.py` 已迁移为 `services/rag/embedding.py`
- 新增 `services/rag/llama_index_adapter.py`，作为唯一直接调用 LlamaIndex 的入口
- `rag_retriever.py` 中的关键词检索、融合排序和附件关系逻辑已拆入：
  - `metadata_filter.py`
  - `relation_resolver.py`
  - `fusion.py`
- 业务 API 保持 `/api/rag/*`

## 8. 前置检查修正

本次继续 M4 前检查并修正了以下问题：

- `main.py` 已引用未提交 RAG 草稿路由，容易造成后端行为依赖半成品代码。本次已完成迁移，路由现在指向 LlamaIndex 版服务。
- M2 中 `policy_chunks.embedding` 为 `vector(1024)`，不适合作为长期 LlamaIndex 向量索引主表。本次设计改为 LlamaIndex 独立 pgvector 表，`policy_chunks` 只负责业务 chunk 与引用定位。
- LlamaIndex `PGVectorStore` 在当前版本中使用 `connection_string` 会生成异常 async URL。本次改为显式传入 host、port、database、user、password。
- 前端使用 `next/font/google` 会在构建时访问 Google Fonts，网络不稳定时导致 build 失败。本次改为系统字体栈，构建不再依赖外网字体。

## 9. 当前验证结果

已完成：

- `python -m compileall app`
- 后端路由导入
- `python app/db/m4_smoke_test.py`
- `POST /api/rag/index/rebuild`
- `GET /api/rag/search`

当前冒烟结果：

- 索引文件数：3
- LlamaIndex 知识库 chunk 数：55
- 检索已返回融合分数、metadata、chunk_id 和引用定位字段

## 10. 参考资料

- LlamaIndex 官方文档：https://docs.llamaindex.ai/
- LlamaIndex PostgreSQL vector store 示例：https://docs.llamaindex.ai/en/stable/examples/vector_stores/postgres/
