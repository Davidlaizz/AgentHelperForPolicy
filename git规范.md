# Git 提交规范

## 1. 文档目的

本文档用于统一当前项目的 Git 提交规范，减少提交信息混乱、历史不可读和团队协作成本高的问题。

后续本仓库的提交信息默认遵循本文档。

## 2. 总体原则

本项目采用 **约定式提交（Conventional Commits）** 标准。

提交信息结构如下：

```text
<type>[可选 scope]: <description>

[可选正文]

[可选尾部]
```

## 3. 标题规范

### 3.1 基本格式

```text
type(scope): description
```

或在不需要 scope 时：

```text
type: description
```

示例：

```text
feat(login): 新增用户登录功能
fix(api): 修复订单查询超时问题
docs(readme): 更新快速入门指南
```

### 3.2 type 取值范围

本项目统一使用以下类型：

- `feat`：新功能
- `fix`：修复问题
- `docs`：文档变更
- `style`：代码样式调整，不影响功能
- `refactor`：代码重构
- `test`：测试相关
- `chore`：构建工具、脚本、依赖或辅助配置变更

### 3.3 scope 说明

`scope` 为可选项，用于标识变更范围，建议写模块名、目录名或领域名。

示例：

- `frontend`
- `backend`
- `infra`
- `docs`
- `rag`
- `agent`
- `database`
- `admin`
- `chat`

示例提交：

```text
feat(frontend): 初始化政策服务工作台首页
fix(backend): 修复健康检查接口数据库状态判断
chore(infra): 新增远端数据库部署脚本
docs(project): 补充阶段导航文档
```

### 3.4 description 说明

`description` 需要满足以下要求：

- 使用简洁明确的中文描述
- 尽量控制在 50 个字符以内
- 以动词开头
- 直接说明本次改动的核心结果

推荐写法：

- `新增用户登录功能`
- `修复文件上传失败问题`
- `补充数据库部署说明`
- `重构政策检索服务`

不推荐写法：

- `更新代码`
- `修改一些问题`
- `继续开发`
- `临时提交`

## 4. 正文规范

正文为可选项，用于说明本次改动的背景、原因和主要内容。

建议：

- 每行不超过 72 个字符
- 优先描述“做了什么”和“为什么做”
- 可使用短列表

示例：

```text
feat(user): 添加用户注册功能

- 新增注册页面和表单校验
- 对接认证接口
- 增加验证码输入流程
```

## 5. 尾部规范

尾部为可选项，常用于关联问题和标记破坏性变更。

### 5.1 关联问题

格式：

```text
Closes #123
Fixes #456
```

### 5.2 破坏性变更

格式：

```text
BREAKING CHANGE: 这里写不兼容变更说明
```

示例：

```text
fix(api): 修复订单查询接口超时问题

- 优化数据库查询语句
- 调整超时处理逻辑

BREAKING CHANGE: timeout 默认值从 3s 调整为 5s
```

## 6. 提交最佳实践

### 6.1 原子性

每次提交只做一个逻辑变更。

例如：

- 前端首页初始化单独提交
- 后端健康检查接口单独提交
- SSH 与数据库部署脚本单独提交

不要把多个不相关改动塞进同一次提交。

### 6.2 可读性

提交信息应该让他人只看 `git log` 就能大致理解项目演进过程。

目标是做到：

- 看得懂做了什么
- 看得懂影响范围
- 看得懂为什么做

### 6.3 避免无意义提交

避免以下提交信息：

- `update`
- `fix bug`
- `改一下`
- `提交`
- `test`

如果确实是测试性质提交，也要明确测试对象，例如：

```text
test(chat): 增加政策问答接口基础测试
```

### 6.4 文档与代码分离

如果文档改动和代码改动逻辑上独立，优先拆分提交。

例如：

- `feat(backend): 初始化 FastAPI 服务骨架`
- `docs(project): 新增后端启动说明`

### 6.5 提交前检查

提交前建议至少确认：

1. 改动是否只覆盖一个逻辑主题
2. 提交信息是否符合 `type(scope): description`
3. 是否需要补正文
4. 是否需要关联 issue
5. 是否包含破坏性变更说明

## 7. 推荐工具

### 7.1 Commitizen

用于交互式生成提交信息。

安装：

```bash
npm install -g commitizen
npx commitizen init cz-conventional-changelog --save-dev --save-exact
```

使用：

```bash
git cz
```

### 7.2 commitlint

用于校验提交信息格式。

安装：

```bash
npm install --save-dev @commitlint/config-conventional @commitlint/cli
```

配置文件 `commitlint.config.js` 示例：

```js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "test", "chore"],
    ],
  },
};
```

### 7.3 husky

用于在 Git 钩子中自动执行校验。

示例：

```json
{
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

## 8. 分支协作建议

推荐采用以下策略：

- `main` / `master`：稳定分支
- `develop`：开发集成分支
- `feature/*`：新功能开发
- `hotfix/*`：线上紧急修复

## 9. 本项目中的推荐 scope

为了便于统一，本项目优先使用以下 scope：

- `frontend`
- `backend`
- `infra`
- `docs`
- `project`
- `database`
- `rag`
- `agent`
- `admin`
- `chat`
- `eligibility`
- `policies`
- `cases`

## 10. 本项目提交示例

### 10.1 新增前端页面

```text
feat(frontend): 初始化政策服务工作台首页
```

### 10.2 新增后端接口

```text
feat(backend): 新增健康检查接口
```

### 10.3 修复数据库连接问题

```text
fix(database): 修复远端数据库连接配置
```

### 10.4 新增部署脚本

```text
chore(infra): 新增虚拟机数据库部署脚本
```

### 10.5 更新项目说明

```text
docs(project): 补充目录导航与环境说明
```

## 11. 执行规则

从本文件创建起，后续本仓库提交默认遵循：

1. 先判断改动属于哪一类 `type`
2. 再判断影响范围 `scope`
3. 用简短准确的中文写 `description`
4. 若有必要，补正文和尾部

如果没有特殊说明，后续提交信息一律按本规范执行。

