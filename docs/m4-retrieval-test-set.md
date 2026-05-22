# M4 检索测试集

## 1. 用途

本文档用于 M4 LlamaIndex RAG 检索验收，记录演示阶段至少 20 条检索问题、期望命中文件与关注点。

## 2. 测试问题

| 编号 | 问题 | 期望命中文件 | 关注点 |
|---|---|---|---|
| RAG-01 | 毕业论文答辩前学生需要准备什么？ | xidian_undergraduate_thesis_regulation_revised.pdf | 毕业论文答辩 |
| RAG-02 | 毕业设计论文盲审不通过怎么办？ | xidian_undergraduate_thesis_regulation_revised.pdf | 盲审结果处理 |
| RAG-03 | 校外做毕业设计需要提交什么申请？ | xidian_undergraduate_thesis_regulation_revised.pdf | 附件申请表 |
| RAG-04 | 校外做毕业论文申请表在哪里？ | xidian_undergraduate_thesis_regulation_revised.pdf | 附件定位 |
| RAG-05 | 毕业设计指导教师有哪些职责？ | xidian_undergraduate_thesis_regulation_revised.pdf | 指导教师职责 |
| RAG-06 | 学院如何组织毕业设计工作？ | xidian_undergraduate_thesis_regulation_revised.pdf | 学院职责 |
| RAG-07 | 教务处负责毕业设计哪些工作？ | xidian_undergraduate_thesis_regulation_revised.pdf | 教务处职责 |
| RAG-08 | 毕业论文成绩评定有哪些要求？ | xidian_undergraduate_thesis_regulation_revised.pdf | 成绩评定 |
| RAG-09 | 毕业设计论文抽查比例是多少？ | xidian_undergraduate_thesis_regulation_revised.pdf | 抽查比例 |
| RAG-10 | 学术不端会如何处理？ | xidian_undergraduate_thesis_regulation_revised.pdf | 学术规范 |
| RAG-11 | 大类专业分流系统在哪里进入？ | xidian_major_stream_student_guide_2025.docx | 专业分流操作 |
| RAG-12 | 大类专业分流如何选择志愿？ | xidian_major_stream_student_guide_2025.docx | 志愿填报 |
| RAG-13 | 专业分流页面有哪些按钮？ | xidian_major_stream_student_guide_2025.docx | 页面按钮 |
| RAG-14 | 转专业或专业分流需要操作哪个模块？ | xidian_major_stream_student_guide_2025.docx | 模块入口 |
| RAG-15 | 大类专业分流学生操作指南讲了什么？ | xidian_major_stream_student_guide_2025.docx | 附件内容 |
| RAG-16 | 附件里的专业分流流程是什么？ | m3_attachment_demo / xidian_major_stream_student_guide_2025.docx | 附件关系 |
| RAG-17 | 问需要什么表时能不能找到申请表？ | xidian_undergraduate_thesis_regulation_revised.pdf | 附件召回 |
| RAG-18 | 本科生毕业设计有哪些质量要求？ | xidian_undergraduate_thesis_regulation_revised.pdf | 质量要求 |
| RAG-19 | 毕业论文修改说明在什么情况下需要？ | xidian_undergraduate_thesis_regulation_revised.pdf | 修改说明 |
| RAG-20 | 专业分流附件能否追溯所属主文件？ | m3_attachment_demo / xidian_major_stream_student_guide_2025.docx | 主附件关系 |

## 3. 当前冒烟结果

已完成基础冒烟：

- 全量重建索引成功
- 当前样例文件数：3
- LlamaIndex 知识库 chunk 数：55
- 已验证查询：
  - `奖学金`
  - `转专业`
  - `毕业论文`
  - `申请表`

## 4. 后续验收规则

M5 前建议补一轮人工评估：

- 每题记录 top-3 命中文件
- 标记是否命中预期文件
- 对失败样例记录原因：
  - chunk 切分不佳
  - metadata 过滤过窄
  - embedding 效果不足
  - 关键词检索未命中
  - 附件关系未补召回
