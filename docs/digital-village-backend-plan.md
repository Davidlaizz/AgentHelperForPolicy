# 数字乡村后端实施规划

## 1. 文档目的

本文档用于指导数字乡村场景后端从零开始的增量实施。核心原则：共享 FastAPI 进程，独立数据库、独立存储、独立配置。

```
├─ Phase 0: 骨架搭建（配置+DB+健康检查）      → /api/digital-village/health 能通
├─ Phase 1: 文档管理 + RAG 检索               → 能上传/解析/索引/搜索政策文档
├─ Phase 2: Chat + Agent（规划预留）           → 能问答
├─ Phase 3: 智慧农业 + 办事引导（规划预留）      → 完整功能
└─ Phase 4: 前端对接 + 双场景回归（规划预留）     → 3001 接入后端
```

## 2. 隔离对照

| 维度 | 高校场景 | 数字乡村场景 |
|------|----------|-------------|
| API 前缀 | `/api/*` | `/api/digital-village/*` |
| PostgreSQL 数据库 | `zhicetong` | `zhicetong_digital_village` |
| 上传目录 | `storage/uploads/` | `storage/digital-village/uploads/` |
| 解析目录 | `storage/parsed/` | `storage/digital-village/parsed/` |
| 向量表名 | `llamaindex_policy_chunks` | `llamaindex_digital_village_policy_chunks` |
| 环境变量前缀 | 无 | `DV_*` |
| 前端端口 | 3000 | 3001 |

---

## Phase 0 — 后端骨架

新建 10 个文件 + 修改 2 个文件。

### 步骤 P0.1：创建目录结构

```bash
mkdir -p backend/app/digital_village/db
mkdir -p backend/app/digital_village/api/routes
mkdir -p backend/app/digital_village/services/rag
mkdir -p backend/app/digital_village/schemas
```

### 步骤 P0.2：新建 `backend/app/digital_village/__init__.py`

空文件。

### 步骤 P0.3：新建 `backend/app/digital_village/config.py`

参考 `backend/app/core/config.py`，创建 `DigitalVillageSettings` 类，全部字段用 `DV_*` 别名。

必含字段：
- `dv_app_name`, `dv_app_env` — 服务标识
- `dv_postgres_host/port/db/user/password`, `dv_database_url` — DB 连接
- `dv_upload_dir`, `dv_parsed_dir`, `dv_max_upload_file_size_mb` — 存储
- `dv_embedding_provider/model/dimensions/api_url/api_key` — Embedding
- `dv_llamaindex_vector_table`, `dv_llamaindex_schema` — 向量表
- `dv_llm_provider/model/api_url/api_key/max_tokens/timeout/thinking_type` — LLM

两个 `@property`：
- `sqlalchemy_database_uri` — 构造连接串
- `max_upload_file_size_bytes` — 转换字节

模块级单例：`dv_settings = DigitalVillageSettings()`

### 步骤 P0.4：新建 `backend/app/digital_village/db/__init__.py`

空文件。

### 步骤 P0.5：新建 `backend/app/digital_village/db/session.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.digital_village.config import dv_settings

engine = create_engine(dv_settings.sqlalchemy_database_uri, future=True, pool_pre_ping=True)

DigitalVillageSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
```

### 步骤 P0.6：新建 `backend/app/digital_village/db/dependencies.py`

```python
from collections.abc import Generator
from sqlalchemy.orm import Session
from app.digital_village.db.session import DigitalVillageSessionLocal

def get_digital_village_db() -> Generator[Session, None, None]:
    db = DigitalVillageSessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 步骤 P0.7：新建 `backend/app/digital_village/db/init_db.py`

```python
from sqlalchemy import text
from app.db.base import Base
from app.digital_village.db.session import engine as dv_engine
from app import models  # noqa: F401

def init_digital_village_db() -> None:
    with dv_engine.begin() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        connection.execute(text("SELECT 1"))
    Base.metadata.create_all(bind=dv_engine)
    # schema patches
    with dv_engine.begin() as connection:
        for col in ["file_size BIGINT", "content_sha256 VARCHAR(64)", "parse_error TEXT",
                     "parsed_text_path VARCHAR(500)", "parsed_at TIMESTAMP WITH TIME ZONE",
                     "is_active BOOLEAN NOT NULL DEFAULT TRUE"]:
            connection.execute(text(f"ALTER TABLE policy_documents ADD COLUMN IF NOT EXISTS {col}"))
```

关键点：导入 `from app import models` 在数字乡村引擎上注册所有表。同一套模型类，不同数据库。

### 步骤 P0.8：新建 `backend/app/digital_village/api/__init__.py`

空文件。

### 步骤 P0.9：新建 `backend/app/digital_village/api/routes/__init__.py`

空文件。

### 步骤 P0.10：新建 `backend/app/digital_village/api/routes/health.py`

```python
from fastapi import APIRouter
from app.digital_village.db.session import engine

router = APIRouter(tags=["digital-village-health"])

@router.get("/health")
def digital_village_health() -> dict[str, str]:
    db_status = "connected"
    try:
        with engine.connect() as connection:
            connection.exec_driver_sql("SELECT 1")
    except Exception:
        db_status = "disconnected"
    return {"status": "ok", "service": "zhicetong-digital-village", "database": db_status}
```

### 步骤 P0.11：新建 `backend/app/digital_village/schemas/__init__.py`

空文件。

### 步骤 P0.12：追加 `backend/.env`

在文件末尾追加：

```ini
# ===== 数字乡村场景配置 =====
DV_POSTGRES_DB=zhicetong_digital_village
DV_POSTGRES_USER=zhicetong
DV_POSTGRES_PASSWORD=Zhct_pg_2026
DV_DATABASE_URL=postgresql+psycopg://zhicetong:Zhct_pg_2026@192.168.216.101:5432/zhicetong_digital_village
DV_UPLOAD_DIR=storage/digital-village/uploads
DV_PARSED_DIR=storage/digital-village/parsed
DV_LLAMAINDEX_VECTOR_TABLE=llamaindex_digital_village_policy_chunks
DV_EMBEDDING_PROVIDER=mock
DV_EMBEDDING_MODEL=mock-hash-embedding-v1
DV_EMBEDDING_DIMENSIONS=1024
DV_LLM_PROVIDER=mock
DV_LLM_MODEL=mock-policy-qa-v1
DV_LLM_MAX_TOKENS=1200
DV_LLM_TIMEOUT_SECONDS=180
DV_LLM_THINKING_TYPE=disabled
```

### 步骤 P0.13：修改 `backend/app/main.py`

改动 4 处：

**① import 区新增：**
```python
from app.digital_village.api.routes.health import router as dv_health_router
from app.digital_village.db.init_db import init_digital_village_db
```

**② lifespan 新增：**
```python
init_digital_village_db()  # 放在 init_db() 之后
```

**③ CORS 新增 origins：**
```python
"http://localhost:3001",
"http://127.0.0.1:3001",
```

**④ 注册路由：**
```python
app.include_router(dv_health_router, prefix="/api/digital-village")
```

### 步骤 P0.14：验证

```bash
cd backend
python run.py

# 验证两个健康检查
curl http://localhost:8000/api/health
# → {"status":"ok","service":"zhicetong-api","database":"connected"}

curl http://localhost:8000/api/digital-village/health
# → {"status":"ok","service":"zhicetong-digital-village","database":"connected"}
```

---

## Phase 1 — 文档管理 + RAG 检索

新建 12 个文件 + 修改 1 个文件。

### 步骤 P1.1：新建 `backend/app/digital_village/services/__init__.py`

空文件。

### 步骤 P1.2：新建 `backend/app/digital_village/services/rag/__init__.py`

空文件。

### 步骤 P1.3：新建 `backend/app/digital_village/services/rag/embedding.py`

参考 `backend/app/services/rag/embedding.py`。

函数：`get_dv_embedding_provider() -> EmbeddingProvider`
- `dv_settings.dv_embedding_provider == "mock"` → `MockEmbeddingProvider(dv_settings.dv_embedding_dimensions)`
- `dv_settings.dv_embedding_provider == "http"` → `HttpEmbeddingProvider()`
- 其他 → `raise RuntimeError`

### 步骤 P1.4：新建 `backend/app/digital_village/services/rag/llama_index_adapter.py`

参考 `backend/app/services/rag/llama_index_adapter.py`。

需要实现 6 个函数：

**① `get_dv_vector_store() -> PGVectorStore`**
- `PGVectorStore.from_params(host=..., port=..., database=..., user=..., password=..., table_name=..., schema_name=..., embed_dim=..., use_jsonb=True, perform_setup=True)`
- 所有参数来自 `dv_settings`

**② `get_dv_embed_model() -> ZhicetongEmbedding`**
- 直接 `ZhicetongEmbedding()`

**③ `build_dv_storage_context() -> StorageContext`**
- `StorageContext.from_defaults(vector_store=get_dv_vector_store())`

**④ `build_dv_policy_node(chunk, document, attachment=None) -> TextNode`**
- 复用现有 `build_node_metadata()` 构造 metadata
- 构造 `TextNode(text=chunk.chunk_text, id_=str(chunk.id), metadata=..., excluded_embed_metadata_keys=list(metadata.keys()))`

**⑤ `dv_index_nodes(nodes: list[TextNode])`**
- `VectorStoreIndex(nodes=nodes, storage_context=build_dv_storage_context(), embed_model=get_dv_embed_model())`

**⑥ `dv_delete_document_nodes(document_id: str)`**
- 构造 `MetadataFilters` 过滤 `document_id`
- 调 `get_dv_vector_store().delete_nodes(filters=...)`

**⑦ `dv_retrieve_nodes(query, filters: LlamaIndexFilter, top_k) -> list[NodeWithScore]`**
- `VectorStoreIndex.from_vector_store(vector_store=get_dv_vector_store(), embed_model=get_dv_embed_model())`
- `.as_retriever(similarity_top_k=top_k, filters=build_metadata_filters(filters))`
- `.retrieve(query)`

### 步骤 P1.5：新建 `backend/app/digital_village/services/rag/indexer.py`

参考 `backend/app/services/rag/indexer.py`。

**① `dv_rebuild_rag_index(session) -> dict`**
- 查询数字乡村 DB 中所有 `parse_status IN ('parsed', 'indexed')` 的文档
- 逐个调 `dv_index_document()`，累加数量
- 返回 `{"document_count": ..., "chunk_count": ...}`

**② `dv_index_document(session, document) -> int`**
- 查询 `PolicyChunk where document_id=document.id`
- 调用 `build_rag_chunks(SourceSegment列表)`
- 调用 `dv_delete_document_nodes(str(document.id))` 清旧数据
- 删除旧 `Citation` 和 `PolicyChunk`
- 遍历 draft 创建新 `PolicyChunk`（注意 metadata 不含高校路径）
- `session.flush()` 后 `build_dv_policy_node()` 逐个建 TextNode
- `dv_index_nodes(nodes)` 写入向量库
- 更新 `document.parse_status = "indexed"`
- 刷新 `search_vector`（同高校的 `_refresh_search_vectors` SQL）

### 步骤 P1.6：新建 `backend/app/digital_village/services/rag/retriever.py`

参考 `backend/app/services/rag/retriever.py`。

**① `dv_hybrid_search(session, query, filters: RetrievalFilters, top_k=5) -> list[dict]`**

```python
def dv_hybrid_search(session, query, filters, top_k=5):
    top_k = max(1, min(top_k, 20))
    vector_results = _dv_vector_search(session, query, filters, top_k * 5)
    keyword_results = _dv_keyword_search(session, query, filters, top_k * 3)
    merged = merge_results(vector_results, keyword_results)
    attach_related_sources(session, merged)
    ranked = sorted(merged.values(), key=lambda x: x["final_score"], reverse=True)
    return ranked[:top_k]
```

**② `_dv_vector_search(session, query, filters, limit) -> list[dict]`**
- 调 `dv_retrieve_nodes(query, LlamaIndexFilter(...), limit)`
- 遍历结果，`load_chunk_row(session, chunk_id)` 加载行数据
- `is_effective()` 过滤已过期
- `row_to_result(row, vector_score=..., keyword_score=0.0, metadata=...)` 格式化

**③ `_dv_keyword_search(session, query, filters, limit) -> list[dict]`**
- 直接调现有 `from app.services.rag.retriever import keyword_search`
- `keyword_search(session, query, filters, limit)` — session 自动确定数据库

### 步骤 P1.7：新建 `backend/app/digital_village/services/document_service.py`

参考 `backend/app/services/document_service.py`。

**① `dv_parse_document(session, document) -> PolicyDocument`**
- `document.parse_status = "parsing"`
- `parse_policy_file(Path(document.file_path), document.file_type)` 解析
- 删除旧 `Citation` 和 `PolicyChunk`
- 遍历 segments 创建新 `PolicyChunk`
- 写入解析文本到 `dv_settings.dv_parsed_dir / f"{document.id}.txt"`
- 更新 `document.parse_status = "parsed"`, `parsed_text_path`, `parsed_at`
- 异常时回滚，设 `parse_status = "failed"`

**② `dv_write_parsed_text(document_id, segments) -> Path`**
- `dv_settings.dv_parsed_dir.mkdir(parents=True, exist_ok=True)`
- 拼接 `[kind page=...]` + text 格式
- `parsed_path.write_text(...)`

### 步骤 P1.8：新建 `backend/app/digital_village/schemas/document.py`

```python
from app.schemas.document import PolicyDocumentResponse, PolicyDocumentUpdateRequest
```

### 步骤 P1.9：新建 `backend/app/digital_village/schemas/rag.py`

```python
from app.schemas.rag import RAGIndexResponse, RAGSearchRequest, RAGSearchResponse
```

### 步骤 P1.10：新建 `backend/app/digital_village/api/routes/documents.py`

参考 `backend/app/api/routes/documents.py`，全部改用 `get_digital_village_db()` 和 `dv_settings`。

**三个端点：**

**① `GET /documents` → `list[PolicyDocumentResponse]`**
- 查询数字乡村 DB 所有文件
- 调用 `serialize_document()`（与高校相同的逻辑，但数据来自数字乡村 DB）

**② `POST /documents/upload` → `PolicyDocumentResponse` (201)**
- `validate_upload(file)` — 检查扩展名（.pdf/.docx/.doc/.html）
- `save_upload_file(file, file_type)` — 保存到 `dv_settings.dv_upload_dir`
- 创建 `PolicyDocument`
- 可选：`auto_parse=True` → 调 `dv_parse_document()`

**辅助函数（与高校代码逻辑相同，存储路径用 dv_settings）：**
- `validate_upload(file)` — 检查后缀，返回类型
- `save_upload_file(file, file_type)` — 写入 `dv_settings.dv_upload_dir`，sha256 校验，大小限制 `dv_settings.max_upload_file_size_bytes`
- `serialize_document(db, document)` — 组装 `PolicyDocumentResponse`（含附件、关联文件、文件大小格式化）

### 步骤 P1.11：新建 `backend/app/digital_village/api/routes/rag.py`

参考 `backend/app/api/routes/rag.py`，全部改用 `get_digital_village_db()` 和 `dv_hybrid_search()` / `dv_rebuild_rag_index()` / `dv_index_document()`。

**四个端点：**

**① `POST /rag/index/rebuild` → `RAGIndexResponse`**
- 调 `dv_rebuild_rag_index(db)`

**② `POST /rag/index/documents/{id}` → `RAGIndexResponse`**
- 查文档是否存在（数字乡村 DB）
- 调 `dv_index_document(db, document)`

**③ `GET /rag/search` → `RAGSearchResponse`**
- query params: query, top_k, policy_level, policy_category, applicable_scope, college, as_of_date, include_expired
- 构造 `RetrievalFilters` → `dv_hybrid_search()`

**④ `POST /rag/search` → `RAGSearchResponse`**
- request body: `RAGSearchRequest`
- 同样调 `run_search()` 逻辑

### 步骤 P1.12：修改 `backend/app/main.py`

在 Phase 0 的 import 区域追加：

```python
from app.digital_village.api.routes.documents import router as dv_documents_router
from app.digital_village.api.routes.rag import router as dv_rag_router
```

在已有数字乡村路由后追加：

```python
app.include_router(dv_documents_router, prefix="/api/digital-village")
app.include_router(dv_rag_router, prefix="/api/digital-village")
```

### 步骤 P1.13：验证

```bash
# 启动
cd backend && python run.py

# 上传文档
curl -X POST http://localhost:8000/api/digital-village/documents/upload \
  -F "file=@/path/to/test.pdf" \
  -F "title=农业补贴政策" \
  -F "policy_category=农业补贴" \
  -F "auto_parse=true"

# 列表
curl http://localhost:8000/api/digital-village/documents

# 重新解析
curl -X POST http://localhost:8000/api/digital-village/documents/{id}/parse

# 重建索引
curl -X POST http://localhost:8000/api/digital-village/rag/index/rebuild

# 搜索
curl -X POST http://localhost:8000/api/digital-village/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"农机补贴","top_k":3}'

# 隔离验证
curl http://localhost:8000/api/documents              # → 高校文档
curl http://localhost:8000/api/digital-village/documents  # → 数字乡村文档
```

---

## Phase 2 — Chat + Agent（规划）

### 步骤 P2.1：新建 `backend/app/digital_village/services/chat_service.py`

参考 `backend/app/services/policy_qa.py`。

- `dv_answer_policy_question(session, question, ...) → ChatResponse`
- 不写热门问题到高校 `HotQuestion` 表
- 不读写高校 `ChatSession` 和 `ChatMessage`

### 步骤 P2.2：新建 `backend/app/digital_village/services/agent_graph/`

两种方案选一：

**方案 A：简版 Agent（推荐，3-5 节点）**
- 场景识别 → 政策检索 → 答案生成
- `state.py`, `agents.py`, `graph.py` 与高校结构相同但简化

**方案 B：复用高校 12 节点图**
- 注入 `dv_settings` 到 graph 构建函数
- 修改 RAG 检索节点指向数字乡村向量库

### 步骤 P2.3：新建 `backend/app/digital_village/api/routes/chat.py`

- `POST /chat` 端点
- 输入：`ChatRequest`（question, session_id, user_id, top_k）
- 输出：`ChatResponse`（answer, policy_basis, ai_inference, citations）
- DB 写入数字乡村 `chat_sessions` 表

### 步骤 P2.4：修改 `backend/app/digital_village/schemas/`

```python
# digital_village/schemas/chat.py
from app.schemas.chat import ChatRequest, ChatResponse
```

### 步骤 P2.5：修改 `backend/app/main.py`

```python
from app.digital_village.api.routes.chat import router as dv_chat_router
app.include_router(dv_chat_router, prefix="/api/digital-village")
```

### 步骤 P2.6：验证

```bash
curl -X POST http://localhost:8000/api/digital-village/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"买农机能不能申请补贴？","top_k":5}'
```

---

## Phase 3 — 智慧农业 + 办事引导（规划）

### 步骤 P3.1：扩展 Agent 场景识别

在简版 Agent 图中增加：
- `AgricultureAgent` — 智慧农业问题诊断（问题类型、痛点、数字化方案、政策联动）
- `GuideAgent` — 办事流程生成（材料清单、流程步骤、缺口检查）

### 步骤 P3.2：新建管理后台端点

参考 `backend/app/api/routes/management.py`。

新建 `digital_village/api/routes/management.py`：

| 端点 | 说明 |
|------|------|
| `GET /management/dashboard` | 数字乡村运营看板 |
| `GET /management/hot-questions` | 数字乡村高频问题 |
| `GET /management/policy-chunks` | 数字乡村条款核查 |
| `GET /management/standard-answers` | 数字乡村标准答案列表 |
| `POST /management/standard-answers` | 创建标准答案 |

所有 DB 操作走 `get_digital_village_db()`。

### 步骤 P3.3：优化输出结构

智慧农业输出格式：
```
问题类型 → 主要痛点 → 涉及对象 → 数字化解决方向 → 可匹配政策 → 落地步骤 → 建议采集数据 → 风险提示
```

办事引导输出格式：
```
办理事项 → 适用对象 → 前置条件 → 必备材料 → 办理步骤 → 办理部门 → 当前缺口 → 注意事项
```

### 步骤 P3.4：修改 `backend/app/main.py`

```python
from app.digital_village.api.routes.management import router as dv_management_router
app.include_router(dv_management_router, prefix="/api/digital-village")
```

---

## Phase 4 — 前端对接 + 双场景回归（规划）

### 步骤 P4.1：前端 `frontend-digital-village` 接入 API

创建 `.env.local`：

```
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/digital-village
```

将现有 `src/data/platform-data.ts` 中的静态数据逐步替换为 API 调用。

### 步骤 P4.2：页面接入改造

| 页面 | 替换内容 | API 端点 |
|------|---------|----------|
| `/chat` | `policyAnswers` ➔ 调 chat API | `POST /chat` |
| `/policies` | `policyDocuments` ➔ 调文档列表 | `GET /documents` |
| `/admin` | dashboard/hotQuestions ➔ 调后台 API | `GET /management/*` |
| `/cases` | `caseItems` ➔ 调事项数据 | 待后端定义 |

### 步骤 P4.3：双场景回归验收

验证内容：
1. `http://127.0.0.1:3000` — 高校前端可访问、可问答
2. `http://127.0.0.1:3001` — 数字乡村前端可访问、可问答
3. `http://127.0.0.1:8000/api/health` — 高校健康检查可用
4. `http://127.0.0.1:8000/api/digital-village/health` — 数字乡村健康检查可用
5. 数字乡村上传文件后，高校政策库不出现该文件
6. 数字乡村问答后，高校热门问题榜不新增该问题
7. 数字乡村搜索只返回数字乡村资料

---

## 3. 复用对照表

### 直接复用（import，不修改）

| 高校文件 | 复用内容 | 为什么能复用 |
|---------|---------|-------------|
| `app/models/*` | SQLAlchemy 模型类 | 同一套类绑定不同引擎即可 |
| `app/schemas/*` | Pydantic schemas | 字段相同，数据源不同 |
| `app/services/rag/chunker.py` | `build_rag_chunks()`, `SourceSegment` | 纯函数，无配置依赖 |
| `app/services/rag/fusion.py` | `merge_results()` | 纯函数，无配置依赖 |
| `app/services/rag/metadata_filter.py` | `RetrievalFilters`, `is_effective()` | 纯函数，无配置依赖 |
| `app/services/rag/relation_resolver.py` | `attach_related_sources()` | 纯函数（SQL 查 session） |
| `app/services/rag/retriever.py` | `keyword_search()`, `load_chunk_row()`, `row_to_result()` | session 自动选库 |
| `app/services/document_parser.py` | `parse_policy_file()`, `ParsedSegment` | 纯文件解析，无配置依赖 |

### 对照重写（参考模式，改配置参数）

| 数字乡村文件 | 参考高校文件 | 变化点 |
|-------------|------------|--------|
| `digital_village/config.py` | `core/config.py` | 字段加 `DV_` 前缀，默认可选 |
| `digital_village/db/session.py` | `db/session.py` | engine 指向数字乡村数据库 |
| `digital_village/db/dependencies.py` | `db/dependencies.py` | session 类名不同 |
| `digital_village/db/init_db.py` | `db/init_db.py` | 引擎换为 `dv_engine` |
| `digital_village/services/rag/llama_index_adapter.py` | `services/rag/llama_index_adapter.py` | `PGVectorStore` 连数字乡村 DB+表 |
| `digital_village/services/rag/indexer.py` | `services/rag/indexer.py` | 调数字乡村 adapter |
| `digital_village/services/rag/retriever.py` | `services/rag/retriever.py` | 向量搜适配器，关键词复用现有 |
| `digital_village/services/document_service.py` | `services/document_service.py` | 存储路径用 `dv_settings` |
| `digital_village/api/routes/documents.py` | `api/routes/documents.py` | DB 注入 + 配置换数字乡村 |
| `digital_village/api/routes/rag.py` | `api/routes/rag.py` | DB 注入 + 服务换数字乡村 |
| `digital_village/api/routes/health.py` | `api/routes/health.py` | engine 换数字乡村 |

---

## 4. 文件清单汇总

### Phase 0（10 新建 + 2 修改）

| # | 文件 | 操作 | 说明 |
|---|------|------|------|
| 1 | `digital_village/__init__.py` | 新建 | 包标记 |
| 2 | `digital_village/config.py` | 新建 | `DigitalVillageSettings` + `dv_settings` |
| 3 | `digital_village/db/__init__.py` | 新建 | 包标记 |
| 4 | `digital_village/db/session.py` | 新建 | `engine` + `DigitalVillageSessionLocal` |
| 5 | `digital_village/db/dependencies.py` | 新建 | `get_digital_village_db()` |
| 6 | `digital_village/db/init_db.py` | 新建 | `init_digital_village_db()` |
| 7 | `digital_village/api/__init__.py` | 新建 | 包标记 |
| 8 | `digital_village/api/routes/__init__.py` | 新建 | 包标记 |
| 9 | `digital_village/api/routes/health.py` | 新建 | `GET /health` |
| 10 | `digital_village/schemas/__init__.py` | 新建 | 包标记 |
| 11 | `backend/.env` | **修改** | 追加 `DV_*` 配置 |
| 12 | `backend/app/main.py` | **修改** | CORS/lifespan/路由 |

### Phase 1（12 新建 + 1 修改）

| # | 文件 | 操作 | 说明 |
|---|------|------|------|
| 1 | `digital_village/services/__init__.py` | 新建 | 包标记 |
| 2 | `digital_village/services/rag/__init__.py` | 新建 | 包标记 |
| 3 | `digital_village/services/rag/embedding.py` | 新建 | `get_dv_embedding_provider()` |
| 4 | `digital_village/services/rag/llama_index_adapter.py` | 新建 | 数字乡村 RAG 适配器 |
| 5 | `digital_village/services/rag/indexer.py` | 新建 | `dv_rebuild_rag_index()` |
| 6 | `digital_village/services/rag/retriever.py` | 新建 | `dv_hybrid_search()` |
| 7 | `digital_village/services/document_service.py` | 新建 | `dv_parse_document()` |
| 8 | `digital_village/schemas/document.py` | 新建 | 复用导出 |
| 9 | `digital_village/schemas/rag.py` | 新建 | 复用导出 |
| 10 | `digital_village/api/routes/documents.py` | 新建 | 文档 CRUD |
| 11 | `digital_village/api/routes/rag.py` | 新建 | RAG 检索/索引 |
| 12 | `backend/app/main.py` | **修改** | 注册文档/RAG 路由 |

### Phase 2（待定）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `digital_village/services/chat_service.py` | Chat 主逻辑 |
| 2 | `digital_village/services/agent_graph/*.py` | 简版 Agent 图 |
| 3 | `digital_village/api/routes/chat.py` | Chat 端点 |
| 4 | `digital_village/schemas/chat.py` | Schema 复用导出 |
| 5 | `backend/app/main.py` | 注册 Chat 路由 |

### Phase 3（待定）

| # | 文件 | 说明 |
|---|------|------|
| 1 | `digital_village/services/agent_graph/agents.py` | 扩展 AgricultureAgent / GuideAgent |
| 2 | `digital_village/api/routes/management.py` | 管理后台端点 |
| 3 | `digital_village/schemas/management.py` | Schema 复用导出 |
| 4 | `backend/app/main.py` | 注册管理路由 |

---

## 5. 潜在风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 数据库 `zhicetong_digital_village` 不存在 | `create_all` 失败 | 手动 `CREATE DATABASE` |
| `HttpEmbeddingProvider` 读全局 settings | 两个场景共用嵌入端点 | Phase 1 接受；Phase 2 重构 |
| `ZhicetongEmbedding` 读全局 model_name | 两个场景共用嵌入模型 | Phase 1 接受 |
| 数字乡村无政策文档 | 测试无数据 | Phase 1 后收集 3-5 份最小政策资料 |

## 6. 相关文档

- [digital-village-agent-platform-plan.md](digital-village-agent-platform-plan.md) — 数字乡村场景总规划（三大模块、Agent 节点、数据设计）
- [目录.md](../目录.md) — 项目当前状态