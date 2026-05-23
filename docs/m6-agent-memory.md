# M6 Agent 编排与记忆说明

## 1. 当前状态

M6 已完成轻量 Python Agent 编排的最小闭环，暂不引入 LangGraph。

已接入现有 `POST /api/chat`：

- 读取短期记忆、事项记忆和长期记忆
- 规则化意图识别
- 创建或复用 `service_cases`
- 同步 `case_slots`
- 将稳定条件写入 `memory_items`
- 对资格判断生成 `eligibility_records`
- 输出缺口追问、材料线索、流程线索和风险校验
- 前端 `/chat` 已展示 Agent 状态、追问、已记住条件、资格判断和线索

## 2. Agent 意图

当前支持：

```text
policy_qa
eligibility_check
workflow_generation
material_list
general_chat
```

意图识别先使用规则实现，后续可替换为 LLM 分类或 LangGraph 节点。

## 3. 事项与 Slot

当前事项类型：

```text
major_transfer
scholarship
thesis
status_change
general_policy
```

转专业事项 slots：

```text
grade
gpa
target_major
has_failed_course
has_disciplinary_record
application_period
```

奖学金事项 slots：

```text
grade
gpa
rank_percent
has_failed_course
has_disciplinary_record
```

毕业论文事项 slots：

```text
grade
outside_unit
has_acceptance_letter
```

## 4. 记忆写入

短期记忆：

- `short_term.conversation.last_user_question`
- `short_term.extracted_slot.*`

事项记忆：

- `case.slot.*`

长期记忆：

- `long_term.profile.grade`
- `long_term.history.last_policy_question`

用户画像不单独建表，继续作为长期记忆中的 `profile` 类型保存。

## 5. 资格判断

资格判断输入：

- 当前事项
- 已知 slots
- RAG 检索结果
- 政策问答结果

输出：

```text
likely_eligible
not_eligible
pending
```

当前为规则化初判，不代替学校或学院最终审核。

## 6. 风险校验

当前风险项：

- 没有检索到政策片段：`high`
- 存在缺失条件：`medium`
- 回答包含不确定表达：`medium`
- 检索结果包含可能过期政策：`medium`

## 7. 验证方式

```bash
cd backend
python -m compileall app
python app/db/m6_smoke_test.py
```

已验证两轮转专业资格判断：

1. 用户问“我能转专业吗？”
2. Agent 追问年级、绩点、目标专业、挂科、处分、申请时间
3. 用户补充“大一，绩点 3.6，无挂科，无处分，想转入计算机专业，今年申请”
4. Agent 复用当前事项，slots 全部变为 `known`
5. 生成 `likely_eligible` 初步判断并写入 `eligibility_records`
