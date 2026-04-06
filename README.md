# @biosbot/agent-brain

> Agent ReAct 框架 - 五阶段认知循环 + 嵌套 ReAct 执行环

Agent ReAct framework with cognitive planning engine — five-phase cognitive cycle with nested ReAct loops, dynamic skill acquisition, and interactive user input.

## 🔹 Core Features

| Feature | Description |
|---------|-------------|
| **Five-phase Cognitive Cycle** | PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT |
| **Nested ReAct** | Outer task planning + inner per-step execution loops |
| **Dynamic Skill Acquisition** | Auto-search and install skills during execution |
| **Interactive User Input** | Pause and wait for user input via `ask_user` tool |
| **Four Thinking Modes** | CREATIVE, LOGICAL, EMPATHETIC, STRUCTURAL |
| **Token Budget** | Context window optimization |
| **Memory Integration** | Context-aware execution |

## Overview

This framework models an agent's task processing as a **five-phase cognitive cycle** that simulates human thought processes:

```
PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT
```

- **PERCEIVE**: Understand the task, identify intent, clarify ambiguities
- **ASSESS**: Evaluate capabilities and resources, determine skill gaps
- **PLAN**: Break down into ordered execution steps
- **EXECUTE**: Execute with per-step ReAct loops (Thought → Action → Observation)
- **REFLECT**: Evaluate results, learn lessons, decide if replanning is needed

### Dual ReAct Architecture

The framework implements a nested ReAct architecture:

- **Outer ReAct**: Five-phase cognitive loop (the brain's macro workflow)
- **Inner ReAct**: Per-step execution loop within EXECUTE phase

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
- **Extensible event system** for observability

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

- **Innate Tools**: Built-in capabilities (skill management, knowledge search)
- **Skill Packages**: Domain-specific tools loaded on-demand

The agent can dynamically acquire new skills during execution using innate tools like `skill_install` and `skill_load_main`.

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

## API Reference

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

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `systemPrompt` | — | System prompt for role definition |
| `modelContextSize` | — | Model context window size (tokens) |
| `maxSteps` | 15 | Max steps per ReAct loop |
| `heartbeatTimeoutMs` | 60000 | Heartbeat timeout threshold |
| `maxConsecutiveFailures` | 3 | Max consecutive failures before termination |
| `maxReplans` | 2 | Max replanning attempts in REFLECT phase |

## Requirements

- Node.js >= 18.0.0
- An LLM client implementing `IModelClient` interface

## License

MIT
