# M1 虚拟机数据库部署说明

## 目标

按 M1 要求将 PostgreSQL + pgvector 部署在远端虚拟机：

- IP: `192.168.216.101`
- SSH 用户: `root`
- SSH 端口: `22`

前端与后端继续运行在本地工作区。

## 计划部署内容

- PostgreSQL 16
- pgvector 扩展
- 数据库名：`zhicetong`
- 业务用户：`zhicetong`
- 对本机开放 `5432`

## 本地连接信息

后端默认通过以下格式连接：

```text
postgresql+psycopg://zhicetong:<password>@192.168.216.101:5432/zhicetong
```

## M1 验收对应

- M1.4：数据库运行在远端虚拟机
- M1.5：本地环境变量通过 `.env` 指向远端数据库

