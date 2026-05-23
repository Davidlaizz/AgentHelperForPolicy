# M3 政策文件上传与解析说明

## 1. 当前状态

M3 已实现政策文件上传、metadata 录入、主附件关系、PDF/DOCX/DOC/HTML 解析、解析状态与失败处理的基础闭环。

当前接口会在上传后写入：

- `policy_documents`
- `policy_attachments`
- `policy_relations`
- `policy_chunks`

其中 `policy_chunks` 在 M3 阶段保存 PDF 页文本或 DOCX 段落文本，M4 会在此基础上继续细化 RAG 切片与索引。

## 2. 接口

### 2.1 文件列表

```text
GET /api/documents
```

返回已上传政策文件、metadata、附件关系、解析状态和解析段数量。

### 2.2 文件上传

```text
POST /api/documents/upload
```

表单字段：

- `file`：PDF、DOCX、DOC 或 HTML 文件
- `title`
- `policy_level`
- `policy_category`
- `issuing_department`
- `applicable_scope`
- `college`
- `publish_date`
- `effective_from`
- `effective_to`
- `version`
- `document_role`：`main` 或 `attachment`
- `parent_document_id`：附件所属主文件
- `attachment_title`
- `auto_parse`：是否上传后自动解析

### 2.3 重新解析

```text
POST /api/documents/{document_id}/parse
```

用于失败文件重试，或重新生成解析段。

## 3. 解析规则

### 3.1 PDF

- 使用 PyMuPDF
- 按页提取文本
- 页码写入 `policy_chunks.page_no`
- 每页文本写入一条 `policy_chunks`

### 3.2 DOCX

- 使用 python-docx
- 按段落提取文本
- 标题段落写入 `section_title`
- 段落顺序写入 `chunk_index`

### 3.3 HTML

- 使用标准库 HTMLParser
- 过滤脚本、样式和空白内容
- 按正文块合并为解析段

### 3.4 DOC

- 针对旧版 Word 二进制 `.doc`，使用 UTF-16LE 文本抽取兜底
- 适合表单类附件抽取字段、材料要求和承诺说明
- 如后续需要复杂排版还原，再接入 LibreOffice/Tika 转换链路

## 4. 文件存储

默认目录：

- 上传原文件：`backend/storage/uploads`
- 解析文本：`backend/storage/parsed`

这两个目录下的实际文件默认不进入 Git，仅保留 `.gitkeep`。

## 5. 验证结果

本阶段已用 M0 样例文件完成验证，并补充 `backend/app/db/seed_m0_documents.py` 用于重复入库/索引 M0 资料：

- 奖学金 HTML 快照：13 个 RAG 切片
- 大类分流通知 HTML 快照：4 个 RAG 切片
- 大类分流操作指南 DOCX：1 个 RAG 切片
- 毕业设计论文条例 PDF：53 个 RAG 切片
- 学籍信息变更申请表 DOC：3 个 RAG 切片

重建已有文件索引时，会先清理该文件旧引用和旧切片，再写入新切片，避免 `citations.chunk_id` 外键阻塞重建。

## 6. 前端入口

管理后台页面已接入真实接口：

```text
http://127.0.0.1:3000/admin
```

可完成：

- 上传 PDF/DOCX/DOC/HTML
- 填写 metadata
- 选择主文件或附件
- 查看解析状态
- 重新解析
