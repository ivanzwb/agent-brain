# @biosbot/agent-brain

[![CI](https://github.com/ivanzwb/agent-brain/actions/workflows/ci.yml/badge.svg)](https://github.com/ivanzwb/agent-brain/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@biosbot/agent-brain.svg)](https://www.npmjs.com/package/@biosbot/agent-brain)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

Agentic AI framework for building autonomous LLM agents with a human-like cognitive architecture. Features a five-phase cognitive cycle (PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT), nested ReAct loops, dynamic skill acquisition, four thinking modes, token budget management, and memory-augmented execution.

English | [中文](./README.zh-CN.md)

## 🔹 Core Features

| Feature | Description |
|---------|-------------|
| **Five-phase Cognitive Cycle** | PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT |
| **Adaptive Fast Path** | PERCEIVE classifies complexity; simple tasks skip to EXECUTE via Strategy pattern (2 LLM calls) |
| **Nested ReAct** | Outer task planning + inner per-step execution loops |
| **Dynamic Skill Acquisition** | Auto-search and install skills during execution |
| **Interactive User Input** | Pause and wait for user input via `ask_user` tool |
| **Four Thinking Modes** | CREATIVE, LOGICAL, EMPATHETIC, STRUCTURAL |
| **Token Budget** | Context window optimization |
| **Memory Integration** | Context-aware execution |
| **Security Sandbox** | Rule-based permission guard (ALLOW / DENY / ASK) for all tool execution |
| **Optional CronHub** | Implement `CronHub` and pass `cron` on `AgentBrain` to expose `cron_*` tools (sample adapter lives under `demo/`) |
| **Prompt registry** | Cognitive and ReAct templates in `src/prompts` (shipped in `dist/prompts`); load via `getPromptByKeyword` / `renderPrompt` / `composePrompt` |

## Overview

This framework models an agent's task processing as a **five-phase cognitive cycle** that simulates human thought processes:

```
PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT
```

The PERCEIVE phase simultaneously classifies task complexity, selecting an **execution strategy**:
- **Simple tasks** (e.g., "find stock-related skills"): `FastPathStrategy` skips to EXECUTE directly (2 LLM calls)
- **Complex tasks** (e.g., "analyze server performance and generate report"): `FullCycleStrategy` runs the full ASSESS → PLAN → EXECUTE → REFLECT cycle

### Dual ReAct Architecture

The framework implements a nested ReAct architecture:

- **Outer ReAct**: Five-phase cognitive loop (the brain's macro workflow)
- **Inner ReAct**: Per-step execution loop within EXECUTE phase (system prompt from `react/plan-step-system.md`, including `react/inter-react-loop.md`)

```
┌─────────────────────────────────────────────────────────────┐
│                    Outer ReAct                               │
│  PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT              │
│                                   │                          │
│                    ┌─────────────┴─────────────┐            │
│                    │     Inner ReAct (per step)│            │
│                    │ Thought → Action → Obs   │            │
│                    │     ↑                │    │            │
│                    │     └──── loop ──────┘    │            │
│                    └───────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **Five-phase cognitive cycle** mimicking human thought processes
- **Per-step ReAct loops** for granular execution control
- **Dynamic skill acquisition** — agents can install new skills during execution
- **Interactive user input** — agents can request user input during execution via `ask_user` tool
- **Four thinking modes**: CREATIVE, LOGICAL, EMPATHETIC, STRUCTURAL
- **Token budget management** for context window optimization
- **Memory integration** for context-aware execution
- **Security sandbox** with rule-based permission control (ALLOW / DENY / ASK) for all tool and skill execution
- **Extensible event system** for observability
- **`run` options**: `conversationId` for stable memory/threading; `fastPath` to force the fast path after PERCEIVE (skip ASSESS / PLAN / REFLECT)

## Installation

```bash
npm install @biosbot/agent-brain
```

## Quick Start

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
    systemPrompt: 'You are a helpful AI assistant.',
    modelContextSize: 128000,
  },
});

const result = await agent.run('Help me analyze the server performance data from last month');
console.log(result.finalAnswer);
```

## Core Concepts

### Five-Phase Cognitive Cycle

| Phase | Description | Output |
|-------|-------------|--------|
| PERCEIVE | Understand user input, identify intent | `Perception` |
| ASSESS | Evaluate capabilities, identify gaps | `Assessment` |
| PLAN | Create execution plan | `Plan` |
| EXECUTE | Execute via per-step ReAct loops | `ExecuteResult` |
| REFLECT | Evaluate results, decide on replanning | `Reflection` |

### Thinking Modes

The framework dynamically adjusts thinking mode weights for each cognitive phase:

- **CREATIVE**: Generate novel ideas, make unexpected connections
- **LOGICAL**: Reason causality, verify consistency
- **EMPATHETIC**: Understand emotions, user needs
- **STRUCTURAL**: Decompose tasks, manage dependencies

### Skills and Tools

- **Innate Tools**: Built-in capabilities (filesystem, commands, web, memory, skills, optional knowledge / cron when hubs are wired)
- **Skill Packages**: Domain-specific tools loaded on-demand

The agent can dynamically acquire new skills during execution using innate tools like `skill_install` and `skill_load_main`.

### Knowledge Base Operations

When you pass a `KnowledgeHub` into `AgentBrain`, four innate KB tools are registered:

| Tool | Description |
|------|-------------|
| `knowledge_list` | List entries; optional **source** filter (not semantic search) |
| `knowledge_add` | Create entry (**source**, **title**, **content**); optional **metadata** |
| `knowledge_delete` | Delete entry by **id** |
| `knowledge_search` | Semantic search over content (**query**; optional **topK**) |

### User Input During Execution

The agent can request user input during execution using the `ask_user` tool. Subscribe to the `user:input-request` event and call `provideUserInput()`:

```typescript
const agent = new AgentBrain({
  // ... config
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

Use `agent.isWaitingForUserInput()` to check if the agent is currently waiting for input.

### Security Sandbox

The framework provides a built-in `SecuritySandbox` that guards all tool execution with permission rules:

- **ALLOW**: Execute without prompting
- **DENY**: Reject immediately (returned to the model as an Observation, allowing fallback)
- **ASK**: Prompt the user before executing (default)

Each innate tool self-declares its `actionCategory` (e.g., `fs_read`, `cmd_exec`, `web_fetch`) and `permissionTargetArgs`, enabling Open/Closed permission checks without hardcoded mappings. Skill tools default to the `skill_exec` category.

Custom rules and working directory:

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
  config: { systemPrompt: 'You are a helpful AI assistant.' },
});
```

Built-in sandbox (omit `sandbox`) uses `config.workingDirectory` for paths and routes ASK to `ask_user`:

```typescript
new AgentBrain({
  model,
  skills,
  memory,
  config: {
    systemPrompt: 'You are a helpful AI assistant.',
    workingDirectory: './agent-workspace',
  },
});
```

`SecuritySandbox` matches rules last-to-first; patterns support glob (`*`, `**`) and regex (`/pattern/`). For custom policy, **subclass** `SecuritySandbox` and override `checkPermission`, `prepareToolExecution` (path + arg injection before tool run), and/or `askPermission` as needed.

## API Reference

### AgentBrain

```typescript
class AgentBrain {
  constructor(options: AgentBrainOptions);
  run(
    userInput: string,
    options?: {
      /** Stable id for memory / conversation grouping (e.g. cron jobs). */
      conversationId?: string;
      /** After PERCEIVE, force FastPathStrategy (skip ASSESS / PLAN / REFLECT). */
      fastPath?: boolean;
    },
  ): Promise<TaskResult>;
}
```

`AgentBrainOptions` also accepts optional **`knowledge`** (`KnowledgeHub`) and **`cron`** (`CronHub`). The npm package exports the **`CronHub`** contract only; a concrete scheduler belongs in your app (see `demo/`).

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

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `systemPrompt` | — | System prompt for role definition |
| `modelContextSize` | — | Model context window size (tokens) |
| `maxSteps` | 15 | Max steps per ReAct loop |
| `heartbeatTimeoutMs` | 60000 | Heartbeat timeout threshold |
| `maxConsecutiveFailures` | 3 | Max consecutive failures before termination |
| `maxReplans` | 2 | Max replanning attempts in REFLECT phase |
| `workingDirectory` | — (built-in sandbox: `os.tmpdir()/.bios-agent`) | Tool working directory when using AgentBrain’s built-in sandbox |

## Requirements

- Node.js >= 18.0.0
- An LLM client implementing `IModelClient` interface

## License

MIT
