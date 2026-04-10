# @biosbot/agent-brain

[![CI](https://github.com/ivanzwb/agent-brain/actions/workflows/ci.yml/badge.svg)](https://github.com/ivanzwb/agent-brain/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@biosbot/agent-brain.svg)](https://www.npmjs.com/package/@biosbot/agent-brain)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

用于构建自主 LLM 智能体的 Agentic AI 框架，具有类人认知架构。包含五阶段认知循环（PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT）、嵌套 ReAct 循环、动态技能获取、四种思维模式、Token 预算管理和记忆增强执行。

[English](./README.md) | 中文

## 🔹 核心亮点

| 特性 | 说明 |
|------|------|
| **五阶段认知循环** | PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT |
| **自适应快速通道** | PERCEIVE 阶段同时分类复杂度，简单任务通过策略模式直接进入 EXECUTE（2 次 LLM 调用） |
| **嵌套 ReAct** | 外层任务规划 + 内层按步骤独立执行循环 |
| **动态技能获取** | 执行过程中自动搜索并安装新技能 |
| **交互式用户输入** | 通过 `ask_user` 工具暂停并等待用户输入 |
| **四种思维模式** | 创造性、逻辑性、情感洞察、结构规划 |
| **Token 预算管理** | 上下文窗口优化 |
| **记忆集成** | 上下文感知的执行 |
| **安全沙箱** | 基于规则的工具执行权限守卫（ALLOW / DENY / ASK） |
| **可选 CronHub** | 实现 `CronHub` 并在 `AgentBrain` 上传入 `cron` 以启用 `cron_*` 工具（示例适配器在 `demo/`） |
| **提示词注册表** | 认知阶段与 ReAct 模板位于 `src/prompts`（构建后位于 `dist/prompts`），可通过 `getPromptByKeyword` / `renderPrompt` / `composePrompt` 加载 |

## 概述

本框架将智能体的任务处理建模为**模拟人类思维过程的五阶段认知循环**：

```
PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT
```

PERCEIVE 阶段同时分类任务复杂度，选择合适的**执行策略**：
- **简单任务**（如“查找 stock 相关的 skill”）：`FastPathStrategy` 直接进入 EXECUTE（2 次 LLM 调用）
- **复杂任务**（如“分析服务器性能并生成报告”）：`FullCycleStrategy` 执行完整的 ASSESS → PLAN → EXECUTE → REFLECT 循环

- **PERCEIVE（感知）**：理解任务，识别意图，澄清模糊点
- **ASSESS（评估）**：评估能力与资源，判断技能缺口
- **PLAN（规划）**：分解为有序的执行步骤
- **EXECUTE（执行）**：通过按步骤的 ReAct 循环执行（Thought → Action → Observation）
- **REFLECT（反思）**：评估结果，总结经验，决定是否需要重新规划

### 双层 ReAct 架构

框架采用嵌套的双层 ReAct 架构：

- **大 ReAct（外层）**：五阶段认知循环（大脑的宏观工作流）
- **小 ReAct（内层）**：EXECUTE 阶段内按步骤的执行循环（system 侧由 `react/plan-step-system.md` 组装，并包含 `react/inter-react-loop.md`）

```
┌─────────────────────────────────────────────────────────────┐
│                   大 ReAct（外层）                            │
│  PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT              │
│                                   │                          │
│                    ┌─────────────┴─────────────┐            │
│                    │  小 ReAct（按步骤独立循环） │            │
│                    │ Thought → Action → Obs    │            │
│                    │     ↑                │    │            │
│                    │     └──── 循环 ──────┘    │            │
│                    └───────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## 功能特性

- **五阶段认知循环**，模拟人类思维过程
- **按步骤独立的 ReAct 循环**，实现精细化执行控制
- **动态技能获取** — 智能体可在执行过程中安装新技能
- **交互式用户输入** — 智能体可通过 `ask_user` 工具在执行过程中请求用户输入
- **四种思维模式**：创造性（CREATIVE）、逻辑性（LOGICAL）、情感洞察（EMPATHETIC）、结构规划（STRUCTURAL）
- **Token 预算管理**，优化上下文窗口利用
- **记忆集成**，实现上下文感知的执行
- **安全沙箱**，基于规则的权限控制（ALLOW / DENY / ASK），守护所有工具和技能的执行
- **可扩展事件系统**，支持可观测性
- **`run` 可选参数**：`conversationId` 固定会话/记忆分组；`fastPath` 在 PERCEIVE 后强制走快速通道（跳过 ASSESS / PLAN / REFLECT）

## 安装

```bash
npm install @biosbot/agent-brain
```

## 快速开始

```typescript
import { AgentBrain, OpenAIClient } from '@biosbot/agent-brain';
import { SkillHub } from '@biosbot/agent-skills';
import { MemoryHub } from '@biosbot/agent-memory';

const model = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
const skills = new SkillHub();
const memory = new MemoryHub();

const agent = new AgentBrain({
  model,
  skills,
  memory,
  config: {
    systemPrompt: '你是一个有帮助的 AI 助手。',
    modelContextSize: 128000,
  },
});

const result = await agent.run('帮我分析上个月的服务器性能数据');
console.log(result.finalAnswer);
```

## 核心概念

### 五阶段认知循环

| 阶段 | 说明 | 产出 |
|------|------|------|
| PERCEIVE | 理解用户输入，识别意图 | `Perception` |
| ASSESS | 评估能力，识别缺口 | `Assessment` |
| PLAN | 创建执行计划 | `Plan` |
| EXECUTE | 通过按步骤的 ReAct 循环执行 | `ExecuteResult` |
| REFLECT | 评估结果，决定是否重新规划 | `Reflection` |

### 思维模式

框架为每个认知阶段动态调整思维模式权重：

- **创造性（CREATIVE）**：产生新颖想法，建立意想不到的联系
- **逻辑性（LOGICAL）**：推理因果关系，验证一致性
- **情感洞察（EMPATHETIC）**：理解情绪和用户需求
- **结构规划（STRUCTURAL）**：分解任务，管理依赖关系

### 技能与工具

- **天生工具**：系统内建能力（文件、命令、网络、记忆、技能；在接入对应 Hub 时还可使用知识库 / 定时任务等工具）
- **技能包**：按需加载的领域专用工具

智能体可在执行过程中通过天生工具（如 `skill_install` 和 `skill_load_main`）动态获取新技能。

### 知识库操作

向 `AgentBrain` 传入 `KnowledgeHub` 后，会注册四个知识库天生工具：

| 工具 | 说明 |
|------|------|
| `knowledge_list` | 列出条目；可选 **source** 过滤（非语义检索） |
| `knowledge_add` | 新建条目（**source**、**title**、**content**）；可选 **metadata** |
| `knowledge_delete` | 按 **id** 删除 |
| `knowledge_search` | 按内容语义检索（**query**；可选 **topK**） |

### 执行过程中的用户输入

智能体可通过 `ask_user` 工具在执行过程中请求用户输入。订阅 `user:input-request` 事件并调用 `provideUserInput()`：

```typescript
const agent = new AgentBrain({
  // ... 配置
  eventPublisher: {
    publish(type, payload) {
      if (type === 'user:input-request') {
        const { question } = payload;
        const userResponse = await getUserInput(question);
        agent.provideUserInput(userResponse);
      }
    },
  },
});
```

使用 `agent.isWaitingForUserInput()` 检查智能体是否正在等待用户输入。

### 安全沙箱

框架内置 `SecuritySandbox`，通过权限规则守护所有工具执行：

- **ALLOW**：无需确认，直接执行
- **DENY**：立即拒绝（作为 Observation 返回给模型，允许回退策略）
- **ASK**：执行前向用户确认（默认）

每个天生工具自声明其 `actionCategory`（如 `fs_read`、`cmd_exec`、`web_fetch`）和 `permissionTargetArgs`，实现无需硬编码映射的开闭原则权限检查。技能工具默认使用 `skill_exec` 类别。

自定义规则与工作目录：

```typescript
import { AgentBrain, SecuritySandbox } from '@biosbot/agent-brain';

const ruleSandbox = new SecuritySandbox('./agent-workspace');
ruleSandbox.addRules([
  { action: 'fs_read', pattern: '/safe/dir/**', permission: 'ALLOW' },
  { action: 'fs_delete', permission: 'DENY' },
  { action: 'web_fetch', pattern: 'https://api.example.com/*', permission: 'ALLOW' },
]);

const agent = new AgentBrain({
  model,
  skills,
  memory,
  sandbox: ruleSandbox,
  config: { systemPrompt: '你是一个有帮助的 AI 助手。' },
});
```

不传 `sandbox` 时使用内置沙箱，通过 `config.workingDirectory` 设置路径，ASK 走 `ask_user`：

```typescript
new AgentBrain({
  model,
  skills,
  memory,
  config: {
    systemPrompt: '你是一个有帮助的 AI 助手。',
    workingDirectory: './agent-workspace',
  },
});
```

规则按从后往前匹配；模式支持 glob（`*`、`**`）与正则（`/pattern/`）。自定义策略请**继承** `SecuritySandbox`，按需覆盖 `checkPermission`、`prepareToolExecution`（执行前路径与参数注入）、`askPermission`。

## API 参考

### AgentBrain

```typescript
class AgentBrain {
  constructor(options: AgentBrainOptions);
  run(
    userInput: string,
    options?: {
      /** 用于记忆 / 会话分组的稳定 id（例如定时任务） */
      conversationId?: string;
      /** 在 PERCEIVE 之后强制走 FastPathStrategy（跳过 ASSESS / PLAN / REFLECT） */
      fastPath?: boolean;
    },
  ): Promise<TaskResult>;
}
```

`AgentBrainOptions` 还可选传入 **`knowledge`**（`KnowledgeHub`）与 **`cron`**（`CronHub`）。npm 包仅导出 **`CronHub`** 接口；具体调度实现由应用负责（可参考 `demo/`）。

### TaskResult

```typescript
interface TaskResult {
  taskId: string;
  status: TaskStatus;
  finalAnswer?: string;
  terminationReason: TerminationReason;
  steps: StepLog[];
  durationMs: number;
  tokenUsage: TokenUsage;
  cognition: {
    perception: Perception;
    assessment: Assessment;
    plan: Plan;
    reflection?: Reflection;
  };
}
```

## 配置项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `systemPrompt` | — | 系统提示词，角色定位与行为规范 |
| `modelContextSize` | — | 模型上下文窗口大小（token 数） |
| `maxSteps` | 15 | 小 ReAct 循环的最大步数 |
| `heartbeatTimeoutMs` | 60000 | 心跳超时阈值 |
| `maxConsecutiveFailures` | 3 | 连续失败次数上限 |
| `maxReplans` | 2 | REFLECT 触发重规划的最大次数 |
| `workingDirectory` | —（内置沙箱默认 `os.tmpdir()/.bios-agent`） | 使用 AgentBrain 内置沙箱时的工具工作目录 |

## 环境要求

- Node.js >= 18.0.0
- 实现 `IModelClient` 接口的 LLM 客户端

## 许可证

MIT
