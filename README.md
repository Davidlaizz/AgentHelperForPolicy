# 智策通

智策通是一个面向高校政策服务场景的智能体化政策理解与精准服务平台。项目以“政策文件难找、难读、难判断”为核心问题，通过 RAG 知识库和多 Agent 编排，为学生、辅导员、教务老师和管理人员提供可追溯、可解释、可运营的政策问答与资格判断能力。

当前版本以高校政策为最小落地场景，已接入政策文件上传、文档解析、知识切片、向量检索、政策问答、条件追问、资格初判、材料流程生成、风险复核和管理后台治理。

## 核心能力

- 政策文件管理：支持 PDF/DOCX 等政策文件上传、解析、metadata 维护、附件关系和启用/禁用管理。
- RAG 知识库：基于 LlamaIndex + PostgreSQL pgvector 构建政策 chunk 检索链路，支持政策层级、学院、有效期和附件等 metadata。
- 多 Agent 编排：使用 LangGraph 组织记忆读取、意图识别、事项识别、槽位抽取、RAG 检索、证据整理、追问、资格判断、流程材料、风险校验、答案生成和记忆写入等节点。
- 政策智能问答：回答中区分“政策依据”和“AI 推断”，并保留引用出处、事项类型和风险提示。
- 资格判断与流程材料：围绕转专业、毕业、奖助学金等事项，支持条件抽取、缺口追问、初步判断和材料流程梳理。
- 管理后台：提供知识库概况、问答运营、Agent 编排图、运行轨迹、复核预警、系统配置和模型服务热更新。

## 技术栈

- 前端：Next.js + TypeScript + Tailwind CSS + lucide-react
- 后端：FastAPI + SQLAlchemy + Uvicorn
- 数据库：PostgreSQL + pgvector
- RAG：LlamaIndex + PostgreSQL 向量表
- Agent：LangGraph + LangChain structured output
- 文档解析：PyMuPDF + python-docx
- 模型服务：OpenAI-compatible HTTP Provider，可在后台运行时切换模型配置

## 目录结构

```text
AgentHelper/
  frontend/      Next.js 前端应用
  backend/       FastAPI 后端服务
  docs/          项目方案、阶段文档和技术说明
  scripts/       部署与辅助脚本
  M0_交付物/     M0 阶段资料与演示问题集
  README.md      项目入口说明
  目录.md        当前状态与文档导航
  git规范.md     Git 提交与协作规范
```

## 本地入口

默认本地服务地址：

- 前端工作台：http://127.0.0.1:3000
- 后端接口文档：http://127.0.0.1:8000/docs

常用页面：

- `/`：工作台
- `/chat`：智能问答
- `/eligibility`：资格判断
- `/cases`：事项中心
- `/policies`：政策库
- `/admin`：管理后台

## 快速启动

后端：

```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```

前端：

```bash
cd frontend
npm install
npm run build
npm run start -- -H 127.0.0.1 -p 3000
```

环境变量示例见：

- [backend/.env.example](backend/.env.example)
- [frontend/.env.example](frontend/.env.example)

## 文档入口

- [目录.md](目录.md)：项目当前状态、阶段交付物和渐进式导航
- [git规范.md](git规范.md)：提交信息与协作规范
- [docs/智策通_项目总方案.md](docs/智策通_项目总方案.md)：项目总方案
- [docs/智策通_技术选型与开发规划.md](docs/智策通_技术选型与开发规划.md)：技术选型与开发规划
- [docs/智策通_LangGraph多Agent升级需求与开发规划.md](docs/智策通_LangGraph多Agent升级需求与开发规划.md)：多 Agent 升级规划

## 当前定位

智策通当前是一个面向创新作品大赛和可运行 Demo 的应用型项目，重点展示“政策服务 + RAG + 多 Agent + 可观测治理”的完整闭环。后续可从高校政策扩展到城市青年政策、企业政策和政府服务场景。
