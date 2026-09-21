# 专业 Skill 说明

> 对应课程第 2 天（9 月 8 日）核心产出：专业 Skill

## 什么是 Skill

Skill 是 Claude Code 的领域知识包：一段带 frontmatter 的 Markdown 指令文件，放在 `.claude/skills/<技能名>/SKILL.md`。当任务命中技能描述时，Claude Code 自动加载该技能作为工作规范，实现"一次沉淀、每次复用"。

## 本项目沉淀的 Skill

### 1. wudong-dev —— 平台开发规范（核心）

路径：`.claude/skills/wudong-dev/SKILL.md`

内容：项目结构、命名规范、统一响应格式、鉴权装饰器用法、数据库约定（防超卖/状态机）、模拟方案（验证码/支付/地图/上传）、代码风格、常见任务流程。

价值：后续任何新模块开发、bug 修复、文档更新，Claude Code 都会自动遵循同一套规范，避免风格漂移。

### 2. 使用方法

- 自动触发：任务描述涉及本项目开发时，Claude Code 根据 description 自动加载
- 手动触发：输入 `/wudong-dev`（若注册为命令）或在提示词中说明"按 wudong-dev 规范"

### 3. Skill 的沉淀过程（AI 协作方法论）

1. **从实践中提炼**：先按常规方式开发首个模块，遇到重复决策（命名、响应格式、鉴权）时记录
2. **写成规范**：把决策固化为 Skill 文档，附代码示例
3. **验证有效性**：在第二个模块开发时让 AI 加载 Skill，对比是否符合规范
4. **持续迭代**：每发现新的重复模式，更新 Skill 文件

这正是 OPC（One Person Company）模式下 AI 协同开发的核心杠杆：把人脑里的隐性规范显性化，让 AI 稳定执行。
