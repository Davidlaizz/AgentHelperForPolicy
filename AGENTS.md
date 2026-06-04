# AGENTS.md — 智策通 (ZhiceTong)

High-signal facts for agent sessions. Read `CLAUDE.md` for full reference; this file adds what is not obvious from that alone.

## Two scenarios, one repo

| Scenario | Frontend dir | Port | API prefix | DB |
|----------|-------------|------|------------|----|
| 高校政策 | `frontend/` | 3000 | `/api/*` | `zhicetong` |
| 数字乡村 | `frontend-digital-village/` | 3001 | `/api/digital-village/*` | `zhicetong_digital_village` |

Backend shares one FastAPI process (`backend/app/main.py`); CORS allows `localhost:3000` and `localhost:3001`. Digital-village backend lives in `backend/app/digital_village/` as a self-contained package (Phase 0–4 complete) with its own config, DB session, documents, RAG, chat, and management routes — all isolated from the 高校 routes.

## Python dependency trap (Windows)

Set `NO_PROXY=*` before pip install to avoid `check_hostname requires server_hostname`:

```powershell
$env:NO_PROXY='*'; $env:no_proxy='*'
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn
pip check  # mandatory — broken deps will silently fail at runtime
```

**LangGraph version lock**: `langchain-core==1.2.17` + `langgraph==1.0.8`. Older versions conflict with `langchain 1.2.10` and `langchain-openai 1.1.10`.

## Testing: smoke tests only

No pytest or dedicated test framework. Verification scripts in `backend/app/db/`:

```bash
cd backend
python app/db/m2_smoke_test.py   # model validation
python app/db/m4_smoke_test.py   # RAG retrieval
python app/db/m5_smoke_test.py   # policy QA
python app/db/m6_smoke_test.py   # agent memory
python app/db/m7_smoke_test.py   # management dashboard
```

Run from `backend/` directory. Requires DB connectivity. No frontend tests exist.

## Frontend quirks

- **Next.js 16.2.6** has breaking changes from earlier versions. When writing frontend code, check `node_modules/next/dist/docs/` for current API reference.
- Production build (`npm run build`) recommended over dev mode — Turbopack hydration can break button/event handlers.
- Two frontend projects, each with its own `package.json`, `node_modules/`. They have **different dependency sets**: only `frontend/` includes `shadcn`, `base-ui`, `class-variance-authority`, `clsx`, and `tailwind-merge`; copying UI code between projects may fail.
- Digital-village frontend binds to `127.0.0.1:3001` by default (configured in `package.json` scripts). The main frontend binds to `127.0.0.1:3000` (via `next.config.ts` `allowedDevOrigins`).
- Lint: `npm run lint` (just `eslint`, no args). Run inside each frontend directory.

## Agent graph architecture

12-node LangGraph in `backend/app/services/agent_graph/`:

```
memory_read → intent → case → slot → retrieval → evidence → [followup|eligibility|workflow] → risk → answer → memory_write
```

Core files: `agents.py` (12 node classes), `graph.py` (wiring + conditional routing after `evidence`), `state.py`, `structured.py`, `logging.py`, `runner.py`.

## Remote database

PostgreSQL `192.168.216.101:5432` with pgvector enabled. SSH host `devbox`. Two databases: `zhicetong` (高校) and `zhicetong_digital_village` (数字乡村). Both initialized with `init_db()` on app startup via lifespan.

## Git

Conventional Commits: `type(scope): description`. Types: `feat|fix|docs|style|refactor|test|chore`. Scopes: `frontend|backend|infra|docs|project|database|rag|agent|admin|chat|eligibility|policies|cases`. See `git规范.md`.

## Key env files

| File | Purpose |
|------|---------|
| `backend/.env` | All backend config (DB, LLM, embedding, storage paths) |
| `frontend/.env.local` | `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` |
| `frontend-digital-village/.env.local` | `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/digital-village` |

## Next.js 16 breaking changes warning

The file `frontend/AGENTS.md` contains a warning that Next.js 16 has breaking API changes. Read `node_modules/next/dist/docs/` before writing frontend code.
