# @biosbot/agent-brain

用于构建自主 LLM 智能体的 Agentic AI 框架，具有类人认知架构。包含五阶段认知循环（PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT）、嵌套 ReAct 循环、动态技能获取、四种思维模式、Token 预算管理和记忆增强执行。

[English](./README.md) | 中文

## 🔹 核心亮点

| 特性 | 说明 |
|------|------|
| **五阶段认知循环** | PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT |
| **嵌套 ReAct** | 外层任务规划 + 内层按步骤独立执行循环 |
| **动态技能获取** | 执行过程中自动搜索并安装新技能 |
| **交互式用户输入** | 通过 `ask_user` 工具暂停并等待用户输入 |
| **四种思维模式** | 创造性、逻辑性、情感洞察、结构规划 |
| **Token 预算管理** | 上下文窗口优化 |
| **记忆集成** | 上下文感知的执行 |

## 概述

本框架将智能体的任务处理建模为**模拟人类思维过程的五阶段认知循环**：

```
PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT
```

- **PERCEIVE（感知）**：理解任务，识别意图，澄清模糊点
- **ASSESS（评估）**：评估能力与资源，判断技能缺口
- **PLAN（规划）**：分解为有序的执行步骤
- **EXECUTE（执行）**：通过按步骤的 ReAct 循环执行（Thought → Action → Observation）
- **REFLECT（反思）**：评估结果，总结经验，决定是否需要重新规划

### 双层 ReAct 架构

框架采用嵌套的双层 ReAct 架构：

- **大 ReAct（外层）**：五阶段认知循环（大脑的宏观工作流）
- **小 ReAct（内层）**：EXECUTE 阶段内按步骤的执行循环

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
- **可扩展事件系统**，支持可观测性

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

- **天生工具**：系统内建能力（技能管理、知识 CRUD）
- **技能包**：按需加载的领域专用工具

智能体可在执行过程中通过天生工具（如 `skill_install` 和 `skill_load_main`）动态获取新技能。

### 知识库操作

框架提供 5 个知识库操作作为天生工具：

| 工具 | 说明 |
|------|------|
| `knowledge_list` | 列出所有条目，支持过滤（类别、数量、偏移量） |
| `knowledge_add` | 添加新条目（标题、内容、类别、标签、元数据） |
| `knowledge_delete` | 按 ID 删除条目（支持软删除/硬删除） |
| `knowledge_search` | 语义搜索（查询、topK、类别、标签、阈值） |
| `knowledge_read` | 按 ID 读取完整条目内容 |

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

## API 参考

### AgentBrain

```typescript
class AgentBrain {
  constructor(options: AgentBrainOptions);
  run(userInput: string): Promise<TaskResult>;
}
```

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

## 环境要求

- Node.js >= 18.0.0
- 实现 `IModelClient` 接口的 LLM 客户端

## 许可证

MIT
