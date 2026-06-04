# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

智策通 (ZhiceTong) — an AI-powered policy understanding and precision service platform. Uses RAG + multi-Agent orchestration to provide traceable, explainable policy Q&A and eligibility determination.

**Current version**: V1.1 LangGraph multi-Agent (12 nodes), M0–M8 milestones completed.

**Two parallel scenarios** currently in the repo:
| Scenario | Frontend | Port | Backend Prefix | Model | Status |
|----------|----------|------|----------------|-------|--------|
| 高校政策 | `frontend/` | 3000 | `/api/*` | gpt-5.3-codex (local) | V1.1 LangGraph 完整闭环 |
| 数字乡村 | `frontend-digital-village/` | 3001 | `/api/digital-village/*` | sensenova-6.7-flash-lite | Phase 0-4 完整（后端骨架+文档RAG+Chat+管理后台+前端对接） |

**项目定位**: 面向创新作品大赛和可运行 Demo 的应用型项目，重点展示"政策服务 + RAG + 多 Agent + 可观测治理"的完整闭环。

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS + lucide-react |
| Backend | FastAPI + SQLAlchemy + Uvicorn |
| Database | PostgreSQL + pgvector |
| RAG | LlamaIndex + pgvector |
| Agent | LangGraph (1.0.8) + LangChain Core (1.2.17) |
| Document Parsing | PyMuPDF + python-docx |
| Model Service | OpenAI-compatible HTTP Provider (sensenova / SiliconFlow / Zhipu GLM / Codex) |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)             │
│  /  /chat  /eligibility  /cases  /policies  /admin│
└──────────────────┬──────────────────────────────┘
                   │ HTTP/REST
┌──────────────────▼──────────────────────────────┐
│              Backend (FastAPI)                   │
│  /api/health  /api/documents  /api/rag          │
│  /api/chat (LangGraph entry)  /api/management   │
│                                                  │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ AgentGraph  │  │   LlamaIndex RAG         │  │
│  │ (12 nodes)  │  │   pgvector chunks        │  │
│  │ LangGraph   │  │                          │  │
│  └─────────────┘  └──────────────────────────┘  │
│                                                  │
│  Models: policy, chat, memory, user, mgmt       │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│         PostgreSQL + pgvector (remote)          │
│  192.168.216.101:5432 / zhicetong               │
│  Tables: policies, documents, chunks,           │
│          chat_sessions, memories, users, ...    │
└─────────────────────────────────────────────────┘
```

### Backend Structure (`backend/app/`)

| Directory | Purpose |
|-----------|---------|
| `api/routes/` | HTTP endpoints: `chat.py`, `documents.py`, `rag.py`, `management.py`, `health.py` |
| `core/` | Config (`config.py`), CORS, security |
| `db/` | Session, init, seeds, smoke tests (m2–m7) |
| `models/` | SQLAlchemy models: `policy.py`, `chat.py`, `memory.py`, `user.py`, `management.py` |
| `schemas/` | Pydantic request/response schemas |
| `services/agent_graph/` | **LangGraph 12-node state graph**: `agents.py` (node definitions), `graph.py` (graph wiring), `state.py` (shared state), `structured.py` (structured output), `config.py`, `logging.py`, `runner.py` |
| `services/rag/` | LlamaIndex index build & retrieval |
| `services/memory/` | Short-term & long-term memory |
| `services/document_parser.py` | PDF/DOCX parsing |
| `services/document_service.py` | Document upload/manage lifecycle |
| `services/llm_provider.py` | Model switching (SiliconFlow / Zhipu / mock) |
| `prompts/` | System prompts (e.g., `policy_qa.md`) |
| `storage/` | `uploads/`, `parsed/` |

### 数字乡村后端 (`backend/app/digital_village/`)

| Directory | Purpose |
|-----------|---------|
| `config.py` | `DigitalVillageSettings` (独立 DV_* 配置) |
| `db/` | 独立 DB session + dependencies + init_db |
| `api/routes/` | 10 条路由: health/documents/rag/chat/management |
| `services/chat_service.py` | Chat 问答（RAG + LLM 直接调用） |
| `services/document_service.py` | 文档解析到独立存储目录 |
| `services/rag/` | 独立 LlamaIndex PGVectorStore 适配器 |
| `schemas/` | 复用高校 Pydantic schema |

### Frontend Structure (`frontend/src/`)

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages: `page.tsx` (home), `chat/`, `eligibility/`, `cases/`, `policies/`, `admin/` |
| `components/` | Shared: `app-nav.tsx`, `markdown-text.tsx`, `section-card.tsx`, `ui/` (shadcn components) |
| `lib/` | Utilities |

### 数字乡村前端 (`frontend-digital-village/src/`)

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages: `page.tsx` (home), `chat/`, `agriculture/`, `guide/`, `cases/`, `policies/`, `admin/` |
| `components/` | Shared: `app-nav.tsx` |
| `data/` | `platform-data.ts` — 静态平台数据 |

**隔离原则**: 数字乡村前端不调用高校 `/api/*` 接口，后续通过 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/digital-village` 接入独立后端。

## Development Commands

### Backend

```bash
cd backend

# Install dependencies (Windows, with proxy workaround)
$env:NO_PROXY='*'
python -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
python -m pip check   # verify no broken requirements

# Run server
python run.py          # uvicorn with reload, port 8000

# Database init & seed
python app/db/init_db.py
python app/db/seed_m0_documents.py   # M0 policy documents

# Smoke tests
python app/db/m2_smoke_test.py   # model validation
python app/db/m4_smoke_test.py   # RAG retrieval
python app/db/m5_smoke_test.py   # policy QA
python app/db/m6_smoke_test.py   # agent memory
python app/db/m7_smoke_test.py   # management dashboard
```

### Frontend (高校场景)

```bash
cd frontend

npm install
npm run dev        # Next.js dev server, http://127.0.0.1:3000
npm run build      # production build
npm run start      # production server
npm run lint       # eslint
```

### Frontend (数字乡村场景)

```bash
cd frontend-digital-village

npm install
npm run dev        # Next.js dev server, http://127.0.0.1:3001
npm run build
npm run start
```

### Remote Database (VM)

```bash
# SSH to devbox
ssh devbox

# Deploy PostgreSQL + pgvector via Docker Compose
cd /opt/zhicetong
docker compose -f vm-db-compose.yml up -d

# Bootstrap script
./vm-db-bootstrap.sh
```

### 日志文件

```
scripts/logs/backend.out.log   # 后端 stdout
scripts/logs/backend.err.log   # 后端 stderr
scripts/logs/frontend.out.log  # 前端 stdout
scripts/logs/frontend.err.log  # 前端 stderr
```

### Windows Python 依赖安装注意事项

在 Windows 上安装后端依赖时，可能遇到 `ValueError: check_hostname requires server_hostname` 错误（系统代理/TLS 配置问题）。解决方法：

```powershell
cd backend
$env:NO_PROXY='*'
$env:no_proxy='*'
python -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
python -m pip check   # 必须确认无依赖冲突
```

## Environment Variables

### Backend (`backend/.env`)

Key variables: `APP_NAME`, `DATABASE_URL`, `UPLOAD_DIR`, `PARSED_DIR`, `EMBEDDING_PROVIDER`, `LLM_PROVIDER`, `LLM_API_URL`, `LLM_API_KEY`, `LLM_THINKING_TYPE`.

See `backend/.env.example` for full list.

### Frontend (`frontend/.env.local`)

See `frontend/.env.example`.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/documents` | List documents |
| POST | `/api/documents/upload` | Upload policy file |
| POST | `/api/documents/{id}/parse` | Re-parse document |
| POST | `/api/rag/index/rebuild` | Rebuild RAG index |
| POST | `/api/rag/index/documents/{id}` | Index single document |
| GET/POST | `/api/rag/search` | Semantic search |
| POST | `/api/chat` | Policy Q&A (LangGraph entry) |
| GET | `/api/management/dashboard` | Admin dashboard data |
| GET | `/api/management/hot-questions` | Hot questions |
| GET/POST | `/api/management/standard-answers` | Standard answers |
| GET | `/api/management/policy-chunks` | Clause verification |

### 数字乡村 API (`/api/digital-village/*`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (独立数据库) |
| GET/POST | `/documents` | List/upload policy docs |
| POST | `/documents/{id}/parse` | Re-parse document |
| PATCH/DELETE | `/documents/{id}` | Update/disable document |
| POST | `/rag/index/rebuild` | Rebuild RAG index |
| POST | `/rag/index/documents/{id}` | Index single document |
| GET/POST | `/rag/search` | Semantic search (独立向量表) |
| POST | `/chat` | Policy Q&A (sensenova model) |
| GET | `/management/dashboard` | Admin dashboard |
| GET | `/management/hot-questions` | Hot questions |
| GET/POST/PATCH/DELETE | `/management/standard-answers` | Standard answers CRUD |
| GET | `/management/policy-chunks` | Clause verification |
| GET | `/management/agent-graph` | Agent 编排图 |
| GET/PATCH | `/management/system-config` | 系统配置 + 运行时热更新 |

## Git Workflow

- **Standard**: Conventional Commits — `type(scope): description`
- **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- **Scopes**: `frontend`, `backend`, `infra`, `docs`, `project`, `database`, `rag`, `agent`, `admin`, `chat`, `eligibility`, `policies`, `cases`
- **Branches**: `main` (stable), `develop` (integration), `feature/*`, `hotfix/*`
- See `git规范.md` for full details including Commitizen, commitlint, husky setup.

## Key Design Patterns

- **LangGraph State Graph**: 12-node directed graph — 记忆读取 → 意图识别 → 事项识别 → 槽位抽取 → RAG检索 → 证据整理 → 追问 → 资格判断 → 流程材料 → 风险校验 → 答案生成 → 记忆写入
- **RAG Pipeline**: LlamaIndex → pgvector → metadata-filtered retrieval (policy level, college, validity period, attachments)
- **Model Hot-Swap**: `LLM_PROVIDER` + `LLM_MODEL` runtime-configurable via admin panel (supports SiliconFlow DeepSeek-V3.2, Zhipu GLM-4.7, local Codex)
- **Answer Structure**: Distinguishes "政策依据" (policy basis) from "AI推断" (AI inference), with citations, item type, and risk warnings

## Important Notes

- **LangGraph version lock**: `langchain-core==1.2.17` + `langgraph==1.0.8` — avoid version drift.旧版本 `langchain-core==1.1.3` + `langgraph==1.0.4` 会与已安装的 `langchain 1.2.10`、`langchain-openai 1.1.10` 产生版本冲突。
- **Frontend**: Production build (`npm run build`) recommended over dev mode to avoid Turbopack hydration issues.
- **Remote DB**: PostgreSQL at `192.168.216.101:5432`, database `zhicetong`, vector extension enabled.
- **Agent graph**: Core logic in `backend/app/services/agent_graph/agents.py` (12 node functions) and `graph.py` (state machine wiring).
- **数字乡村隔离**: 高校场景使用 `frontend/` + `/api/*`，数字乡村使用 `frontend-digital-village/` + `/api/digital-village/*` + 独立数据库 `zhicetong_digital_village` + 独立存储目录。后端共享 FastAPI 进程。
- **模型服务**: SiliconFlow `Pro/deepseek-ai/DeepSeek-V3.2` 与智谱 `glm-4.7` 已验证连通性。当前 `backend/.env` 配置为智谱 GLM，关闭 Thinking 以降低 RAG 问答延迟。

## Documentation Navigation

- Root: `README.md` (project intro), `目录.md` (current status & navigation, **优先阅读**), `git规范.md` (commit standards)
- `docs/`: Phase documents (M0–M8), LangGraph upgrade planning, scenario test sets, 数字乡村规划
- `M0_交付物/`: M0 deliverables (policy list, metadata CSV, demo questions)

### 优先阅读顺序

1. [目录.md](目录.md) — 当前状态、关键入口、下一步
2. [智策通_项目总方案.md](docs/智策通_项目总方案.md)
3. [智策通_LangGraph多Agent升级需求与开发规划.md](docs/智策通_LangGraph多Agent升级需求与开发规划.md)
4. [digital-village-agent-platform-plan.md](docs/digital-village-agent-platform-plan.md) — 数字乡村规划
