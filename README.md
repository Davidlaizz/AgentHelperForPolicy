# 智策通 V1.0

智策通是一个面向高校政策服务场景的智能体化政策理解与精准服务平台。

当前仓库按照 [智策通_细分开发任务清单.md](D:\woskspace\AgentHelper\docs\智策通_细分开发任务清单.md) 推进，已完成：

- M0：需求冻结与资料准备
- M1：基础工程搭建
- M2：数据库与数据模型
- M3：政策文件上传与解析
- M4：LlamaIndex RAG 知识库构建
- M5：政策智能问答

## 目录结构

```text
AgentHelper/
  frontend/      Next.js 前端
  backend/       FastAPI 后端
  docs/          项目文档、规划方案与补充说明
  scripts/       部署与辅助脚本
  M0_交付物/     M0 阶段交付材料
  README.md      项目入口说明
  目录.md        文档导航与当前状态
  git规范.md     提交与协作规范
```

## 技术栈

- 前端：Next.js + TypeScript + Tailwind CSS + shadcn/ui
- 后端：FastAPI + SQLAlchemy + Uvicorn
- 数据库：PostgreSQL + pgvector
- 文件解析：PyMuPDF + python-docx
- RAG：LlamaIndex + PostgreSQL pgvector
- 问答：统一 LLM Provider + RAG 引用

## 运行说明

后续开发默认采用：

- 前后端运行在本机
- PostgreSQL 运行在远端虚拟机 `192.168.216.101`

详细环境变量与运行方式见：

- [frontend/.env.example](D:\woskspace\AgentHelper\frontend\.env.example)
- [backend/.env.example](D:\woskspace\AgentHelper\backend\.env.example)
- [docs/m1-vm-database-setup.md](D:\woskspace\AgentHelper\docs\m1-vm-database-setup.md)
