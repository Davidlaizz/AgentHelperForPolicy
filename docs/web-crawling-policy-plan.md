# 政策网站自动爬取与 RAG 集成方案

## 1. 需求分析

以 https://gr.xidian.edu.cn/ 为例，需要从政策网站自动提取：
- 列表页：政策标题（含超链接）、发布日期、发布部门
- 详情页：政策正文内容（需通过超链接进入）
- 附件：PDF/DOCX 等附件文件
- 两阶段 RAG：标题元数据快速过滤，命中后加载完整内容做深度检索

## 2. 方案对比

| 方案 | 优势 | 劣势 |
|------|------|------|
| Firecrawl MCP | 开箱即用，map/scrape/crawl，返回 clean markdown | 需 API Key，免费 500次/月 |
| Playwright MCP | 已安装，可处理 JS 渲染 | 需手写选择逻辑，不适合批量 |
| Python 爬虫脚本 | 完全可控，可集成现有 pipeline | 需开发维护，反爬 |
| 混合方案（推荐） | Firecrawl 发现+提取，Python 过滤+入库 | 需配置两套工具 |

## 3. 推荐方案：Firecrawl MCP + Python 管道

### 3.1 整体架构

```
Firecrawl MCP (URL发现 + 内容提取)
  map("gr.xidian.edu.cn")     → 发现所有URL
  scrape(url)                 → 提取为 Markdown
  crawl(subdomain, maxPages)  → 全站批量抓取
        │
        ▼ Markdown / JSON
Python 元数据处理管道 (policy_crawler.py)
  解析标题 → 提取metadata → 关联附件 → 写入DB
  两阶段索引：标题层(fast) + 正文层(deep)
        │
        ▼ PolicyDocument + PolicyChunk
LlamaIndex RAG Pipeline (现有)
  dv_hybrid_search() → 标题匹配 → 正文检索 → 回答
```

### 3.2 Firecrawl MCP 安装

```bash
claude mcp add firecrawl -e FIRECRAWL_API_KEY=YOUR_KEY -- npx -y firecrawl-mcp
```

- API Key: https://www.firecrawl.dev/app/api-keys
- 免费额度: 500 次 scrape/月, 5 次 agent/天
- GitHub: https://github.com/innFactory/firecrawl-mcp-server

### 3.3 工具矩阵

| 工具 | 作用 | 示例 |
|------|------|------|
| map | 发现网站所有 URL | map("gr.xidian.edu.cn") |
| scrape | 抓取单页为 Markdown | scrape(url) |
| batch_scrape | 批量抓取多个 URL | batch_scrape([url1, url2]) |
| crawl | 全站爬取(设 depth/limit) | crawl("gr.xidian.edu.cn", maxPages=50) |

### 3.4 Python 管道设计

新建 `backend/app/services/policy_crawler.py`，工作流：

1. firecrawl map 获取所有 URL 列表
2. firecrawl batch_scrape 批量提取每个页面为 Markdown
3. 从 Markdown 中解析：标题(h1/h2)、发布日期、发布部门、正文、附件链接
4. 下载附件 → 上传到 dv_settings.dv_upload_dir
5. 创建 PolicyDocument → dv_parse_document → dv_index_document
6. 更新 metadata: source_url, crawled_at, policy_category

### 3.5 两阶段 RAG 设计

**Tier 1 — 元数据快速过滤（标题层）**
```
SELECT * FROM policy_documents
WHERE title ILIKE '%关键词%' OR policy_category = '类别'
ORDER BY authority_rank DESC
```
返回匹配的政策标题列表

**Tier 2 — 正文深度检索（内容层）**
```
仅对 Tier 1 命中的文档范围：
dv_hybrid_search(query, filters={document_id IN matched})
```
大幅减少向量搜索空间，提升检索精度

## 4. 为什么这是最优解

- 开发效率：Firecrawl 的 HTML→Markdown 转换成熟，无需自写解析器
- 控制力：Python 管道完全控制 metadata 提取、附件关联、入库流程
- 模式一致：与现有 seed_dv_documents.py 模式相同，易维护
- 成本友好：免费额度 500次/月足够初期使用
- 不选纯 MCP：每次调用需 AI 决策，批量爬取效率低、成本高
- 不选纯脚本：自建爬虫需处理 JS 渲染、反爬、HTML 变化，维护成本高

## 5. 实施步骤

### Phase W1：Firecrawl MCP 安装验证

| 步骤 | 操作 |
|------|------|
| 1 | 注册 Firecrawl 账号获取 API Key |
| 2 | `claude mcp add firecrawl` 安装 |
| 3 | 测试 `map("gr.xidian.edu.cn")` 验证 URL 发现 |
| 4 | 测试 `scrape(url)` 验证内容提取质量 |

### Phase W2：Python 爬虫管道

| 步骤 | 操作 |
|------|------|
| 1 | 新建 `backend/app/services/policy_crawler.py` |
| 2 | `discover_urls(site)` — 调用 firecrawl map |
| 3 | `scrape_policy_page(url)` — 调用 firecrawl scrape |
| 4 | `extract_metadata(markdown)` — 解析标题/日期/部门 |
| 5 | `extract_attachment_links(markdown)` — 解析附件链接 |
| 6 | `crawl_and_index(site, session)` — 完整管道 |

### Phase W3：两阶段 RAG 改造

| 步骤 | 操作 |
|------|------|
| 1 | `dv_hybrid_search` 增加 `document_ids` 参数 |
| 2 | chat_service 中先做标题匹配缩小范围 |
| 3 | 仅对命中文档做全文向量搜索 |

### Phase W4：定时更新

| 步骤 | 操作 |
|------|------|
| 1 | 实现 `is_already_crawled(url)` 去重检查 |
| 2 | Cron 定时任务定期增量更新 |
| 3 | 爬取日志和异常告警 |

## 6. 备选方案

方案 B：纯 Playwright MCP — 已安装，只适合单页调试，不适合批量
方案 C：纯 Python (BeautifulSoup+httpx) — 零外部依赖，但对 JS 页面需额外处理
方案 D：RSS/API 接入 — 多数国内政策网站没有提供
