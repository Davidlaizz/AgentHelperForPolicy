# 智策通高并发架构方案（10万用户级）

## 1. 目标与现状

| 指标 | 当前 | 目标 |
|------|------|------|
| 注册用户 | < 100 | 10 万 |
| 日活用户 | < 10 | 2-5 万 |
| 并发 QPS | < 10 | 500-2000 |
| P99 延迟 | 5-15s | < 3s |
| 部署模式 | 单进程 uvicorn | 多 worker + 多实例 |
| LLM 调用 | 同步 HTTP，单 Key | 异步 + Key 池 + 队列 |

### 当前瓶颈

1. **FastAPI 单 worker** — 只能利用 1 个 CPU 核
2. **PostgreSQL 单实例** — 读写共用，连接数有限
3. **LangGraph Agent 同步调用** — 12 节点串行，阻塞线程
4. **单 LLM API Key** — 速率限制（通常 60 RPM）
5. **Mock Embedding** — 语义不准，检索命中率低
6. **无缓存层** — 重复查询每次搜 DB + 调 LLM

## 2. 后端：Gunicorn 多 Worker

### 当前

python run.py（单进程，reload 模式）

### 改为

gunicorn app.main:app -w 9 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120

| 参数 | 值 | 说明 |
|------|-----|------|
| workers | 9 (4核 x 2 + 1) | 充分利用 CPU |
| timeout | 120s | LLM 调用可能慢 |
| max_requests | 10000 | 防内存泄漏 |
| jitter | 1000 | 避免同时重启 |

效果: QPS 从 ~10 提升到 ~200（单机）

## 3. 请求队列 + 背压

class RequestQueue:
    max_concurrent = 50
    max_queue = 200
    acquire() -> 超出返回 429
    release()

- 最多同时处理 50 个请求
- 超过 200 排队则返回 429
- 保护 LLM API 不被流量打爆

## 4. Agent 异步化

当前（同步阻塞主线程）:
def answer_policy_question():
    graph_result = run_policy_multi_agent_graph(...)  # 阻塞 5-15s

改为（异步到线程池）:
async def answer_policy_question():
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(thread_pool, run_policy_multi_agent_graph, ...)

路由也改为 async:
@router.post("/chat")
async def chat():
    await queue.acquire()
    try: return await answer_policy_question(...)
    finally: queue.release()

效果: Worker 在等 LLM 时可以切去处理其他请求

## 5. 数据库优化

### 连接池

engine = create_engine(DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20, max_overflow=40,
    pool_recycle=3600, pool_pre_ping=True)

9 workers x 20 = 180 常驻连接，峰值 540

### 读写分离

写操作（上传/聊天/记忆）-> 主库
读操作（检索/列表/热点）-> 从库

### 索引优化

CREATE INDEX idx_docs_category ON policy_documents(policy_category, is_active);
CREATE INDEX idx_chat_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_hot_count ON hot_questions(hit_count DESC);
CREATE INDEX idx_memory_scope ON memory_items(memory_scope, user_id);

## 6. Redis 缓存层

### RAG 检索缓存

key = "rag:" + md5(query + filters + top_k)
if cached: return cached
else: search -> setex 5min -> return

预期缓存命中率 > 60%

### 热门问题缓存

Top 20 缓存 10 分钟

### 会话状态缓存

用户会话缓存 1 小时

## 7. LLM 并发优化

### 多 API Key 池

配置 3 个 Key，每个限速 60 RPM，总计 180 RPM
轮询选择最空闲的 Key

### LLM 响应缓存

同 prompt + 同 contexts -> 直接返回缓存的回答
TTL 30 分钟

### 请求重试 + 退避

失败后重试 3 次，指数退避: 1s, 2s, 4s

## 8. RAG 检索优化

### 真实 Embedding

当前: Mock 哈希伪嵌入（语义不准）
替换: BGE-large-zh-v1.5
EMBEDDING_PROVIDER=http
EMBEDDING_MODEL=BAAI/bge-large-zh-v1.5
EMBEDDING_API_URL=https://api.siliconflow.cn/v1/embeddings

切换后重建索引: POST /rag/index/rebuild

### pgvector 索引

CREATE INDEX ON policy_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

向量检索从全表扫描 -> 近似近邻搜索，延迟降低 10-50 倍

### 检索降级策略

1. 向量搜索 (1ms) -> 2. 关键词搜索 (5ms) -> 3. 无过滤全量 (10ms) -> 4. 无答案返回

## 9. 前端优化

- npm run build + npm run start（生产模式）
- Next.js standalone 输出
- CDN 缓存静态资源 (/_next/static/*)
- ISR 增量静态再生 (/, /chat, /policies)
- 首屏 CSS 内联，非首屏懒加载

## 10. 部署架构

                    CDN
                      |
            +---------+---------+
            |         |         |
         Next.js x3  Next.js x3  Next.js x3
            |         |         |
            +---------+---------+
                      |
                    Nginx（负载均衡）
                      |
            +---------+---------+
            |         |         |
         FastAPI x3  FastAPI x3  FastAPI x3
        (9 worker)  (9 worker)  (9 worker)
            |         |         |
            +---------+---------+
                      |
            +---------+---------+
            |         |         |
          Redis    PG 主库   PG 从库

### Nginx 配置

upstream backend {
    least_conn;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
}
server {
    listen 80;
    location /api/ { proxy_pass http://backend; }
    location / { proxy_pass http://127.0.0.1:3000; }
}

### 服务器配置

| 服务 | 数量 | 规格 |
|------|:--:|------|
| Nginx | 1 | 2C4G |
| FastAPI | 3 | 4C8G |
| Next.js | 3 | 2C4G |
| PostgreSQL | 2 | 4C16G SSD |
| Redis | 1 | 2C8G |
| 合计 | 10 台 | |

## 11. 容量估算

| 场景 | QPS | 需要 | 满足? |
|------|:--:|------|:--:|
| 峰值 2000 | 2000 req/s | 27 workers | 每 worker ~75 QPS |
| 每请求 1x LLM | 2000/s | 3+ Keys | 每 Key ~670 RPM |
| 每请求 1x RAG | 2000/s | Redis 缓存 | 命中率 > 60% |
| 每请求 2x DB | 4000/s | 读写分离 | 从库分担读 |

## 12. 实施优先级

| 优先 | 改动 | 效果 | 工时 |
|:--:|------|------|:--:|
| P0 | Gunicorn 多 worker | QPS x5-10 | 0.5 天 |
| P0 | Redis 检索缓存 | 重复 0ms | 1 天 |
| P0 | DB 连接池 + 索引 | 延迟 -50% | 0.5 天 |
| P1 | Agent 异步化 | 释放线程 | 1 天 |
| P1 | LLM Key 池 + 缓存 | 突破限速 | 1 天 |
| P1 | 请求队列 | 防雪崩 | 0.5 天 |
| P2 | 真实 Embedding | 命中率 +30% | 0.5 天 |
| P2 | pgvector 索引 | 检索快 10x | 0.5 天 |
| P2 | 读写分离 | 写不阻塞读 | 1 天 |
| P2 | Nginx + 多实例 | 水平扩展 | 1 天 |
| P3 | CDN + ISR | 前端加速 | 0.5 天 |
| P3 | Prometheus | 可观测 | 1 天 |

## 13. 快速启动

# 生产启动后端
pip install gunicorn redis
gunicorn app.main:app -w 9 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 --timeout 120

# Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 生产启动前端
cd frontend-digital-village && npm run build && npm run start

# 数据库索引
psql -h HOST -U USER -d DB -c "CREATE INDEX CONCURRENTLY idx_docs_category ON policy_documents(policy_category, is_active);"
