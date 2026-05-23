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
grant
postgraduate_recommendation
thesis
graduation
leave_request
discipline
status_change
student_status
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

助学金事项 slots：

```text
grade
difficulty_level
has_difficulty_identification
material_status
application_period
```

保研事项 slots：

```text
grade
rank_percent
gpa
english_score
research_awards
has_failed_course
has_disciplinary_record
```

毕业与学位事项 slots：

```text
grade
credits_completed
thesis_status
cet4_qualified
has_disciplinary_record
```

请假/休复学事项 slots：

```text
grade
leave_type
leave_days
has_supporting_material
leave_off_campus
```

处分事项 slots：

```text
violation_type
process_stage
appeal_intent
impact_focus
```

学籍管理事项 slots：

```text
grade
status_action
has_supporting_material
college_review_status
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
- 保研、毕业等高影响事项默认提示主管部门复核：`medium`
- 处分事项默认标记为高影响风险：`high`

## 7. 验证方式

```bash
cd backend
python -m compileall app
python app/db/m6_smoke_test.py
```

已验证两轮转专业资格判断，并补充 8 类事项识别：

1. 用户问“我能转专业吗？”
2. Agent 追问年级、绩点、目标专业、挂科、处分、申请时间
3. 用户补充“大一，绩点 3.6，无挂科，无处分，想转入计算机专业，今年申请”
4. Agent 复用当前事项，slots 全部变为 `known`
5. 生成 `likely_eligible` 初步判断并写入 `eligibility_records`

本轮新增的 8 类事项覆盖：

```text
奖学金 -> scholarship
助学金 -> grant
转专业 -> major_transfer
保研 -> postgraduate_recommendation
毕业 -> graduation / thesis
请假 -> leave_request
处分 -> discipline
学籍管理 -> student_status / status_change
```
