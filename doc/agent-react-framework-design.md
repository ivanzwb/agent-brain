# Agent Brain — Cognitive Framework Design

## 1. Overview

### 1.1 Design Philosophy

When humans face any task—whether it's "order me a coffee" or "write a million-word novel"—the brain goes through the same cognitive process. The only difference is that for simple tasks, these stages flash by in milliseconds, nearly imperceptible.

This framework models an agent's task processing as a **five-phase cognitive cycle that simulates the human brain**:

```
  Understand Task   Evaluate Capability   Decompose & Plan    Execute & Monitor    Reflect & Optimize
    PERCEIVE    →      ASSESS        →       PLAN       →      EXECUTE       →      REFLECT
                                               ↑                                       │
                                               └──────── When replanning needed ───────┘
```

These five phases are not exclusive to complex tasks—**all tasks go through the complete five phases**. The only difference is speed:
- Simple tasks ("What day is it today?"): all five phases complete within a second or two
- Complex tasks ("Design a distributed system"): each phase expands in depth, and REFLECT may trigger a return to PLAN for revision

### 1.2 Dual-Layer ReAct Architecture

The framework adopts a **nested dual-layer ReAct** architecture:

- **Outer ReAct** (macro layer): the five-phase cognitive cycle PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT — the brain's macro workflow
- **Inner ReAct** (micro layer): the Thought → Action → Observation iterative loop inside the EXECUTE phase. **Each plan step (PlanStep) runs an independent inner ReAct loop**, with context passed between steps via outputs

```
┌─────────────────────────────────────────────────────────────┐
│              Outer ReAct — Cognitive Cycle (Macro)           │
│                                                             │
│  PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT              │
│                                 │                           │
│                    ┌────────────┴─────────────┐             │
│                    │  Inner ReAct — Execution  │             │
│                    │         Loop (Micro)       │             │
│                    │                           │             │
│                    │  Independent loop per      │             │
│                    │  PlanStep:                 │             │
│                    │  Thought → Action → Obs   │             │
│                    │     ↑                 │   │             │
│                    │     └──── Loop ───────┘   │             │
│                    │                           │             │
│                    │  Outputs passed between    │             │
│                    │  steps as context          │             │
│                    └───────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Design Goals

This document defines the logical design of Agent Brain, focusing on **the complete mechanism by which a single agent completes a task through cognitive cycles**. Specifically:

- The workflow of the five-phase cognitive cycle and each phase's responsibilities
- The relationship model between Skills and Tools
- Control logic of the inner ReAct execution loop
- Dynamic scheduling of four thinking modes
- Context assembly strategy
- Loop termination, exception handling, and observability
- Extension points and integration interfaces exposed by the framework

**Out of scope for this document**:

The framework collaborates with external systems through abstract interfaces. The internal implementation of the following systems is out of scope:
- Source systems for contextual data and their internal implementation (storage, retrieval, archival)
- Registration and lifecycle management of tools and skill packages (installation, uninstallation, runtime startup)
- Permission policy configuration and management
- Model integration and adaptation
- Multi-agent task decomposition and orchestration
- Frontend layout and interaction design

---

## 2. Five-Phase Cognitive Cycle

### 2.1 Overview

The framework processes every task through a **five-phase cognitive cycle**. The first phase — PERCEIVE — simultaneously classifies task complexity, enabling an **execution strategy** to be selected before the remaining phases run:

```
Task Input
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  Phase 1: PERCEIVE — Understand Task & Classify       │
│  Identify intent, clarify ambiguities, define success │
│  criteria, and classify complexity (simple / complex) │
│  For simple tasks: also produce a ready-to-execute    │
│  single-step plan (fastPlan)                          │
├─────────────┬──────────────────────────────────────── |
│             │                                        │
│   simple    │   complex                              │
│      │      │      │                                 │
│      ▼      │      ▼                                 │
│  FastPath   │  FullCycle                             │
│  Strategy   │  Strategy                              │
│  EXECUTE    │  ASSESS → PLAN → EXECUTE → REFLECT     │
│      │      │      │                                 │
│      ▼      │      ▼                                 │
│   Result    │   Result                               │
└─────────────┴────────────────────────────────────────┘
```

**Fast Path** (simple tasks): PERCEIVE produces a single-step plan (`fastPlan`), the `FastPathStrategy` skips ASSESS/PLAN/REFLECT and goes directly to EXECUTE. Reduces LLM calls from 5+ to 2.

**Full Cycle** (complex tasks): The `FullCycleStrategy` proceeds through ASSESS → PLAN → EXECUTE → REFLECT as described below.

Both strategies implement the `ExecutionStrategy` interface, making it easy to add new execution paths (e.g., a `MediumPathStrategy`) without modifying `AgentBrain`.

```
Task Input
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  Phase 1: PERCEIVE — Understand the Task              │
│  Receive information, identify intent, clarify         │
│  ambiguities                                          │
│  Output: Perception (surface request + deep intent +  │
│          success criteria)                             │
└────────────┬─────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────┐
│  Phase 2: ASSESS — Evaluate Capabilities & Resources  │
│  Consider what knowledge and skills the task requires  │
│  (regardless of whether the agent currently has them)  │
│  Inventory available tools and skills, judge fit & gaps│
│  Output: Assessment (required skills + matched skills  │
│          + missing skills + risks)                     │
└────────────┬─────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────┐
│  Phase 3: PLAN — Decompose & Plan                     │
│  Break the task into ordered execution steps           │
│  Output: Plan (strategy + step list + dependencies +  │
│          expected outcome)                             │
└────────────┬─────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────┐
│  Phase 4: EXECUTE — Execute & Monitor                 │
│  (Inner ReAct Loop)                                   │
│  Execute plan step by step, adapt flexibly to          │
│  obstacles                                            │
│  Acquire new skills via innate tools when needed       │
│  Output: ExecuteResult (execution steps + final answer)│
└────────────┬─────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────┐
│  Phase 5: REFLECT — Reflect & Optimize                │
│  Evaluate results, accumulate experience, handle       │
│  emotions                                             │
│  ├── Met criteria → Output final result               │
│  └── Not met → Return to PLAN (up to 2 retries)      │
│  Output: Reflection (goal met + lessons learned +     │
│          whether to replan)                            │
└──────────────────────────────────────────────────────┘
```

### 2.2 Phase 1: PERCEIVE — Understand the Task

> Human analogy: Upon receiving a task, the brain first parses the incoming information—what was said? What does the other person really want? What's unclear?

**Responsibilities**:

- **Receive information**: Obtain the user's raw input
- **Identify intent**: Distinguish surface requests from deep needs
  - Surface: "Write me a report" → Deep: What type of report? Who is the audience? Format requirements?
- **Clarify ambiguities**: Identify ambiguities in the task description
  - When ambiguous, flag it (can proactively ask questions or make reasonable assumptions later)
- **Define success criteria**: Clarify what constitutes a "completed" result
- **Classify complexity**: Determine whether the task is `simple` or `complex`
  - Simple: single-action, clear 1-2 tool call mapping
  - Complex: multi-step, dependencies, analysis/synthesis, unclear approach
  - When in doubt, classify as `complex`
- **Generate fast plan** (simple tasks only): Produce a single-step `fastPlan` so ExecutionStrategy can skip ASSESS/PLAN/REFLECT

**Output structure** — `Perception`:

```json
{
  "surfaceRequest": "Write me a report",
  "deepIntent": "Need a quarterly security audit report for the technical director, emphasizing risk trends",
  "constraints": ["Due next Friday", "No more than 20 pages", "Must include data charts"],
  "ambiguities": ["Which quarter is unspecified", "Whether bilingual versions are needed is unclear"],
  "successCriteria": ["Cover all security incidents", "Trend analysis backed by data", "Format conforms to company template"],
  "complexity": "complex"
}
```

For simple tasks, the output also includes `fastPlan`:

```json
{
  "surfaceRequest": "Find stock-related skills",
  "deepIntent": "Search the skill registry for stock analysis skills",
  "constraints": [],
  "ambiguities": [],
  "successCriteria": ["Return a list of matching skills"],
  "complexity": "simple",
  "fastPlan": {
    "strategy": "Search for stock-related skills",
    "steps": [{ "id": "s1", "description": "Search skill registry for stock-related skills", "dependsOn": [] }],
    "expectedOutcome": "List of matching skills"
  }
}
```

**Thinking mode**: Led by **Empathetic Insight**—understanding "what they really want" from the other person's perspective, supplemented by logical thinking to verify the accuracy of understanding.

### 2.3 Phase 2: ASSESS — Evaluate Capabilities & Resources

> Human analogy: After understanding the task, the brain performs **metacognition**—what knowledge and skills does this task require? Do I have them? If not, where can I find them? How difficult is it? How risky?

**Core principle**: The ASSESS phase first **thinks about what knowledge and skills are needed from the task's perspective**, independent of whether the agent currently possesses those skills. First clarify "what's needed," then inventory "what's available," and finally determine "what's missing."

**Responsibilities**:

1. **Requirements analysis** (task-driven):
   - What **domain knowledge** is needed to complete this task? (e.g., security audit knowledge, data analysis capability, chart generation)
   - What **operational skills** are needed? (e.g., file read/write, database queries, PDF generation)
   - What **external resources** are needed? (e.g., historical security data, company templates, audit standard documents)

2. **Capability inventory** (self-resource matching):
   - **Installed skill packages**: What skill packages are currently installed? What domains do they cover?
   - **Innate tools**: Built-in system tools (file operations, network requests, etc.), usable without any skill package
   - **Match assessment**: Compare required skills against available skills, marking matches/gaps

3. **Risk assessment**:
   - Task complexity rating: `simple` / `moderate` / `complex`
   - Feasibility judgment: Can the task be completed? If not fully feasible, where are the gaps?
   - Failure impact assessment: What happens if it goes wrong?

**Output structure** — `Assessment`:

```json
{
  "capabilityMatch": "Requires security audit and report generation; currently has data analysis and file management skills",
  "skillCategories": ["security-audit", "report-generation"],
  "matchedSkillCategories": ["data-analysis", "file-management"],
  "missingSkillCategories": ["security-audit"],
  "risks": ["Lack of security audit domain knowledge may lead to improper use of professional terminology", "Incomplete historical data may affect trend analysis"],
  "complexity": "moderate",
  "feasible": true
}
```

**Thinking mode**: Led by **Logical Thinking**—objectively and honestly evaluating capability match, supplemented by structural planning thinking to systematically inventory resources.

#### 2.3.1 Relationship Between Skills and Tools

Understanding the distinction between skills and tools is crucial in the ASSESS phase:

```
┌──────────────────────────────────────────────────────┐
│               Skill Package (Skill)                   │
│                                                      │
│  Domain knowledge: Security audit methodology,        │
│  standard frameworks, professional terminology        │
│  ──────────────────────────────────────────────       │
│  Tool A: query_security_events (query security events)│
│  Tool B: generate_risk_matrix (generate risk matrix)  │
│  Tool C: format_audit_report (format audit report)    │
│                                                      │
│  → Knows in what scenarios, in what order, and with   │
│    what parameters to call these tools                │
│  → Managed through SkillHub, available after loading  │
│    via skill_load_main                                │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│               Innate Tool                             │
│                                                      │
│  Unified registration and management via              │
│  InnateToolHub                                        │
│  Includes: skill management tools, knowledge          │
│  retrieval tools, etc.                                │
│                                                      │
│  → Basic capabilities that don't require domain       │
│    knowledge to use                                   │
└──────────────────────────────────────────────────────┘
```

**Key insight**: Most tools are not independently usable—they need to be combined with a corresponding **skill package** to know how to use them, when to use them, and with what parameters. Skill packages provide not just tools, but also **domain knowledge and usage paradigms**.

Human analogy: Anyone can pick up a kitchen knife (tool), but only someone with cooking skills knows when to use which knife, how to cut, and to what size.

### 2.4 Phase 3: PLAN — Decompose & Plan

> Human analogy: After figuring out what's needed, the brain starts making an action plan—what to do first, what to do next, what can be done in parallel, and what has dependencies.

**Responsibilities**:

- **Task decomposition**: Break the large task into several ordered smaller steps
  - Simple tasks may only have 1–2 steps; no need for excessive decomposition
  - Complex tasks require multi-level decomposition with dependency annotations
- **Set objectives**: Define expected output and milestones for each step
- **Formulate plan**: Arrange step execution order, considering dependencies

**Output structure** — `Plan`:

```json
{
  "strategy": "First collect historical security data, then perform trend analysis, finally generate a formatted report",
  "steps": [
    { "id": "s1", "description": "Query security event logs for the most recent quarter", "dependsOn": [] },
    { "id": "s2", "description": "Classify and perform statistical analysis on security events", "dependsOn": ["s1"] },
    { "id": "s3", "description": "Generate risk trend charts", "dependsOn": ["s2"] },
    { "id": "s4", "description": "Generate audit report according to company template", "dependsOn": ["s2", "s3"] }
  ],
  "expectedOutcome": "A complete quarterly security audit report including event statistics, trend analysis, and risk assessment"
}
```

**Thinking mode**: Led by **Structural Planning (Engineering Thinking)**—systematically decomposing task structure and dependencies, supplemented by creative thinking to explore multiple possible execution paths.

### 2.5 Phase 4: EXECUTE — Execute & Monitor

> Human analogy: The plan is ready; time to start doing. During execution, continuously check progress and adjust methods when problems arise. **This is where the agent confronts whether it actually has the required knowledge and skills**—if not, it needs to learn or seek help.

The EXECUTE phase runs the **inner ReAct loop**—the phase where actual "hands-on work" happens.

#### 2.5.1 Step-by-Step Execution Following the Plan

The EXECUTE phase is not a single monolithic loop, but rather **executes step by step following the step list produced by the PLAN phase**. Each plan step (PlanStep) runs an independent ReAct loop, with the output of the previous step automatically injected into the next step as context:

```
  Plan = [s1, s2, s3, s4]

  s1: ─ ReAct(s1) ─► output_1
                        │
  s2: ─ ReAct(s2, output_1) ─► output_2
                                  │
  s3: ─ ReAct(s3, output_2) ─► output_3
                                  │
  s4: ─ ReAct(s4, output_2, output_3) ─► output_4 = final answer
```

ReAct loop within each PlanStep:

```
          ┌───────────┐
          │  Thought   │  Reason based on current step goal
          │            │  and existing context
          │            │  Output: state analysis, next decision
          └─────┬─────┘
                │
                ▼
          ┌───────────┐
          │  Action    │  Execute tool call or generate answer
          │            │  Output: tool call intent or final reply
          └─────┬─────┘
                │
                ▼
          ┌───────────┐
          │Observation │  Receive execution result
          │            │  Output: tool return value or error
          └─────┬─────┘
                │
         ┌──────┴──────┐
         │ Step done?   │
         ├── No → Think │
         └── Yes→ Return│
```

**Key design decisions**:

- Each PlanStep has its own independent message history, uncontaminated by other steps' intermediate processes
- Previous steps' outputs are injected into the current step's user prompt via `[Prior Step Outputs]`
- Memory is retrieved once at the beginning of each PlanStep, serving as that step's initial context
- If a step terminates abnormally, subsequent steps are not executed

**Key distinction**: Unlike the ASSESS phase, the EXECUTE phase **directly confronts the reality of its own capabilities**:

- **Has the skill** → Directly invoke the corresponding tools
- **Lacks the skill** → Needs to **acquire** new knowledge and skills

#### 2.5.2 Skill Acquisition — System Innate Tools

When the execution process discovers a missing skill, the agent can acquire it through **system innate tools**:

```
Discovered during execution: missing security-audit domain knowledge
    │
    ▼
┌──────────────────────────────────────┐
│  Call innate tool: search/install     │
│  skill package                        │
│  search_skills("security audit")      │
│  install_skill("security-audit")      │
└────────────┬─────────────────────────┘
             ▼
  New skill package loaded, new tools available
    │
    ▼
  Continue task execution
```

**Innate tools** are built-in system capabilities, belonging to the agent's "innate abilities," independent of any external skill package. They are unified through `InnateToolHub` for registration and management:

| Innate Tool | Tool Name | Description |
|-------------|-----------|-------------|
| List skills | `skill_list` | List currently installed skill packages and their capability descriptions |
| Install skill | `skill_install` | Dynamically load a skill package |
| Load main skill | `skill_load_main` | Load a skill's main module, making its tools available |
| Load reference skill | `skill_load_reference` | Load a skill's reference/auxiliary module |
| List skill tools | `skill_list_tools` | List all tools provided by a skill package |

When `AgentBrain` is constructed with a **KnowledgeHub**, four additional innate tools are registered:

| Innate Tool | Tool Name | Description |
|-------------|-----------|-------------|
| Knowledge list | `knowledge_list` | List KB entries (optional **source** filter) |
| Knowledge add | `knowledge_add` | Create an entry (**source**, **title**, **content**; optional **metadata**) |
| Knowledge delete | `knowledge_delete` | Delete an entry by **id** |
| Knowledge search | `knowledge_search` | Semantic search over KB content (**query**; optional **topK**) |

Human analogy: Humans are born knowing how to walk, grasp things, and speak (innate skills), but cooking, programming, and playing piano require learning (skill packages). Learning itself relies on innate skills—using eyes to read tutorials, using hands to practice.

#### 2.5.3 Self-Monitoring During Execution

The inner ReAct loop continuously performs self-monitoring during execution:

- **Progress check**: Is current progress aligned with the plan?
- **Obstacle identification**: Have any unexpected problems been encountered?
- **Strategy adjustment**: When facing obstacles, adapt flexibly—switch to a different tool, try a different approach, look up information, acquire new skills
- **Quality control**: Does each step's output meet expected standards?

#### 2.5.4 Execution Termination Conditions

| Termination Condition | Trigger | Result Status |
|----------------------|---------|---------------|
| Model outputs final reply | Determines task is complete, no further tool calls | Normal completion |
| Max steps reached | Loop count exceeds preset limit (default: 15 steps) | Abnormal termination |
| User-initiated termination | User clicks terminate during execution | Manual termination |
| Unrecoverable error | Multiple consecutive tool call failures, etc. | Abnormal termination |
| Heartbeat timeout | Single step execution time exceeds threshold | Abnormal termination |

**Output structure** — `ExecuteResult`:

```json
{
  "status": "COMPLETED",
  "finalAnswer": "Quarterly security audit report generated, file saved at /reports/Q3-2026-security-audit.pdf",
  "steps": [ /* Thought/Action/Observation logs for all steps */ ],
  "planStepResults": [
    { "stepId": "s1", "output": "...", "terminationReason": "COMPLETED", "steps": [...] },
    { "stepId": "s2", "output": "...", "terminationReason": "COMPLETED", "steps": [...] }
  ],
  "terminationReason": "COMPLETED"
}
```

**Thinking mode**: Led by **Logical Thinking**—rigorous and orderly plan execution, supplemented by creative thinking to flexibly handle unexpected obstacles.

### 2.6 Phase 5: REFLECT — Reflect & Optimize

> Human analogy: After completing the work, review—how well was it done? Where can I improve? What did I learn? Could I do better next time with similar tasks?

**Responsibilities**:

- **Result evaluation**: Compare execution results against the success criteria defined in the PERCEIVE phase
  - Were expectations met? Which criteria were satisfied, which were not?
- **Experience accumulation**: Summarize lessons learned from this task
  - What methods worked? What didn't? Were any better approaches discovered?
  - These experiences can be stored in long-term memory for future similar tasks
- **Emotional regulation**: Process the "satisfaction" or "frustration" arising from task results
  - On success: Increase confidence weight for similar tasks
  - On failure: Analyze causes, avoid excessive self-criticism, focus on actionable improvements
- **Replan decision**: If results are unsatisfactory, decide whether to return to PLAN for replanning
  - Needs replanning → Return to PLAN phase (max 2 retries)
  - Best effort reached or problem unsolvable → Output current best result with explanation of shortcomings

**Output structure** — `Reflection`:

```json
{
  "goalMet": true,
  "strengths": ["Comprehensive data collection", "Clear trend analysis charts"],
  "improvements": ["Professional terminology in report could be more accurate", "Could add year-over-year analysis"],
  "lessonsLearned": ["Security audit reports should first confirm data time range", "Confirm data format before chart generation"],
  "needsReplan": false
}
```

**Thinking mode**: **Logical Thinking + Empathetic Insight** in equal measure—logic for objectively evaluating results, empathy for sensing the quality of output and the user's likely satisfaction, supplemented by creative thinking to find improvement ideas.

---

## 3. Four Core Thinking Modes

### 3.1 Thinking Mode Overview

The brain naturally activates different thinking styles during different cognitive phases. The framework abstracts these into four core thinking modes, dynamically weighted across the five phases by a **Thinking Mode Scheduler**:

#### Creative Thinking (Divergent Mode — CREATIVE)

- **Function**: Break conventions, generate novel ideas, establish unexpected connections
- **Operating method**:
  - Generate multiple candidate solutions rather than locking onto one
  - Use analogies and metaphors to expand the space of ideas
  - Allow "imperfect" intermediate ideas for later screening and convergence
- **Output forms**: Candidate idea lists, inspiration association maps, possibility space exploration

#### Logical Thinking (Convergent Mode — LOGICAL)

- **Function**: Reason about cause and effect, verify consistency, build rigorous structures
- **Operating method**:
  - Select the optimal solution from candidates
  - Check structural completeness and self-consistency
  - Trace causal chains, eliminate logical contradictions
- **Output forms**: Structured proposals, dependency graphs, logic verification reports

#### Empathetic Insight (Empathy Mode — EMPATHETIC)

- **Function**: Understand human emotions, aesthetic preferences, and deep needs
- **Operating method**:
  - Evaluate output quality from the user's perspective
  - Infer the real needs the user hasn't explicitly stated
  - Judge aesthetic quality and emotional resonance
- **Output forms**: User experience expectations, needs insight analysis

#### Structural Planning (Engineering Mode — STRUCTURAL)

- **Function**: Decompose tasks, prioritize, manage dependencies and resources
- **Operating method**:
  - Break vague goals into clear executable units
  - Identify inter-task dependencies and parallelization opportunities
  - Assign priorities and resource budgets
- **Output forms**: Task decomposition trees, execution order tables, milestone plans

### 3.2 Dynamic Scheduling of Thinking Modes

The framework uses a **Thinking Mode Scheduler** to weight different thinking modes for each cognitive phase:

| Cognitive Phase | Primary Thinking Mode | Secondary Thinking Mode | Description |
|----------------|----------------------|------------------------|-------------|
| PERCEIVE | Empathetic Insight (50%) | Logical (25%) | Understand needs from the other's perspective; logic verifies correctness |
| ASSESS | Logical (45%) | Structural Planning (40%) | Objectively analyze capability match; systematically inventory resources |
| PLAN | Structural Planning (50%) | Logical (25%), Creative (20%) | Engineering decomposition as primary; preserve creative space |
| EXECUTE | Logical (50%) | Structural Planning (25%) | Rigorous execution as primary; orderly progress |
| REFLECT | Logical (35%) | Empathetic Insight (30%) | Logically evaluate results; empathetically sense quality |

The model receives thinking mode guidance in the system prompt for each phase, for example:

> "Currently in the PERCEIVE phase. Prioritize empathetic insight to understand the user's real needs—what they say and what they want may not be exactly the same. Use logical thinking to verify that your understanding is self-consistent."

### 3.3 Cognitive Artifacts and Lifecycle

The five phases each produce structured **cognitive artifacts** that persist throughout the task lifecycle:

| Phase | Cognitive Artifact | Content | Lifecycle |
|-------|-------------------|---------|-----------|
| PERCEIVE | Perception | Surface request, deep intent, constraints, ambiguities, success criteria | Valid throughout entire task |
| ASSESS | Assessment | Capability match, matched skills, missing skills, risks, complexity | Valid throughout entire task |
| PLAN | Plan | Strategy, step list, dependencies, expected outcome | Valid for current round; REFLECT can trigger revision |
| EXECUTE | ExecuteResult | All step logs, independent PlanStep results, final answer | Valid for current round |
| EXECUTE (sub) | PlanStepResult | ReAct logs and output for a single plan step | Output passed to dependent steps after step completion |
| REFLECT | Reflection | Goal met determination, strength/weakness analysis, lessons learned, replan decision | Triggers experience storage or PLAN revision |

---

## 4. Inner ReAct Execution Loop — Detailed Design

### 4.1 Step-by-Step Loop Structure

The inner ReAct runs within the EXECUTE phase, where **each plan step (PlanStep) has an independent Thought → Action → Observation loop**. ReactLoop traverses plan steps in dependency order, executing step by step:

```
ReactLoop.run(plan)
    │
    ├── for each planStep in plan.steps:
    │       │
    │       ├── Collect dependent steps' outputs (priorContext)
    │       ├── Retrieve memory (MemoryHub.searchMemory)
    │       ├── Build system prompt + user prompt
    │       │
    │       └── runPlanStep(planStep, priorContext):
    │               │
    │               ├── Thought → Action → Observation loop
    │               │       │
    │               │       ├── THOUGHT: Model reasoning
    │               │       ├── ACTION: Tool call (innate tools → skill tools)
    │               │       └── OBSERVATION: Receive result
    │               │
    │               └── Step complete → PlanStepResult
    │
    └── All steps complete → ExecuteResult
```

Within each PlanStep's ReAct loop:

1. **Thought**: Model receives the current step's context and outputs reasoning process
   - Current state analysis
   - Next step plan
   - Whether tools are needed

2. **Action**: Execute operations based on thinking results
   - **Tool call**: Select a tool and provide parameters
   - **Final reply**: Determine step is complete, output step result (loop terminates)

3. **Observation**: Receive action results
   - Innate tools matched first (`InnateToolHub.hasTool()`)
   - Innate tool not found → Fall back to skill tools (`SkillHub.execute()`)
   - Tool call fails → Return error message
   - Special handling: After `skill_load_main` / `skill_load_reference` executes, refresh the tool list provided by that skill

### 4.2 Inner ReAct loop (prompt template)

ReactLoop builds the PlanStep **system** prompt from the registered template `react/plan_step_system` (`src/prompts/react/plan-step-system.md`). That file expands `{{include:react/inter-react-loop.md}}`, which defines the Thought → Action → Observation rules (and pulls in skill / recall fragments). The opening line of the inner template is `[Inter ReAct loop]`.

### 4.3 Execution Context Injection

Each PlanStep's ReAct loop receives rich context:

**System prompt** — rendered via `buildPlanStepSystemPrompt` → `renderPrompt('react.plan_step_system', …)` (placeholders + optional blocks):

| Layer | Content | Source |
|-------|---------|--------|
| 1 | System prompt (role definition + behavioral norms) | Outer `ReactLoopContext.systemPrompt` (EXECUTE phase text from AgentBrain) |
| 2 | Inner ReAct loop rules (+ included fragments) | `react/plan-step-system.md` → `react/inter-react-loop.md` |
| 3 | Thinking mode guidance | `ReactLoopContext.thinkingGuidance` |
| 4 | Execution plan overview (all steps and dependencies) | `Plan` (built in `ReactLoop.buildPlanOverviewText`) |
| 5 | Current step description | `PlanStep` |
| 6 | Installed skill catalog (optional) | `SkillHub.getSkillsDescription()` |
| 7 | Skill gap hint (optional) | `Assessment.missingSkillCategories` |
| 8 | Memory context (optional) | `MemoryHub.memory_search` for the step |

**User Prompt Assembly**:

| Layer | Content | Source |
|-------|---------|--------|
| 1 | Execution strategy | Plan.strategy |
| 2 | Current step objective | PlanStep.description |
| 3 | Prior step outputs | Dependent steps' PlanStepResult.output |
| 4 | Expected overall outcome | Plan.expectedOutcome |
| 5 | Action directive | Fixed text |

**Available Tools** (passed to model via `tools` parameter):

- Innate tools: `InnateToolHub.getTools()` (fixed, unchanging)
- Skill tools: `SkillHub.getTools(skillName)` (dynamically appended after loading skills)

### 4.4 Tool Routing & Execution

When the model outputs a tool call intent (ToolCallIntent), ReactLoop routes in the following order:

```
Model output: call tool "X" with args {...}
    │
    ├── Exempt check (ask_user, memory_*, skill_*, etc.)?
    │       │
    │       ├── YES → Skip sandbox, execute directly
    │       │
    │       └── NO → SecuritySandbox.checkPermission(action, target)
    │                   │
    │                   ├── DENY → Return denial as Observation
    │                   ├── ASK  → Prompt user; denied → Observation
    │                   └── ALLOW / approved → Continue
    │
    ├── InnateToolHub.hasTool("X")?
    │       │
    │       ├── YES → InnateToolHub.execute("X", args)
    │       │           │
    │       │           └── Special handling: skill_load_main / skill_load_reference
    │       │                 → Refresh skillTools = SkillHub.getTools(skillName)
    │       │
    │       └── NO → SkillHub.execute(skillName, "X", args)
    │
    └── Execution result → Observation → Appended to message history
```

The sandbox permission check is **centralized in ReactLoop** before any tool dispatch. Each innate tool self-declares its `actionCategory` and `permissionTargetArgs` via the `InnateTool` interface, so the routing logic does not need a hardcoded mapping (Open/Closed Principle). Skill tools default to the `skill_exec` action category.

### 4.5 Step Log Structure

Each step produces a structured log entry:

| Field | Description |
|-------|-------------|
| stepNumber | Current loop iteration number |
| cognitivePhase | Fixed as EXECUTE |
| phase | THOUGHT / ACTION / OBSERVATION |
| content | Text output for this phase |
| toolName | Tool name (ACTION phase) |
| toolArguments | Tool arguments (ACTION phase) |
| timestamp | Timestamp |

### 4.6 Per-Step Execution Result

Each PlanStep produces a `PlanStepResult` upon completion:

```json
{
  "stepId": "s2",
  "steps": [ /* Thought/Action/Observation logs for this step */ ],
  "output": "Final output text of the step",
  "terminationReason": "COMPLETED"
}
```

The `output` field is the step's deliverable, which is injected into the user prompt of subsequent steps that depend on it.

---

## 5. Hub Architecture & Tool-Skill Integration

### 5.1 Unified Hub Abstraction

The framework uses the **IHub** base interface to provide a unified abstraction for the three major capability modules: tools, skills, and memory. Each Hub can declare what tools it owns and provide tool definition query capabilities:

```typescript
/** Hub base interface */
interface IHub {
  getToolDefinition(toolName: string): ToolDefinition | undefined;
  hasTool(toolName: string): boolean;
}
```

The framework has three core Hubs:

```
┌──────────────────────────────────────────────────────┐
│                 IHub (Base Interface)                  │
│   getToolDefinition(name) / hasTool(name)             │
├────────────┬────────────────┬─────────────────────────┤
│            │                │                         │
│  InnateToolHub     SkillHub          MemoryHub        │
│  (Innate Tools)   (Skill Center)    (Memory Center)   │
│  register()       getSkillsDesc()   searchMemory()    │
│  getTools()       getTools(skill)   trackMessage()    │
│  execute()        execute()                           │
└────────────┴────────────────┴─────────────────────────┘
```

### 5.2 InnateToolHub — Innate Tool Center

`InnateToolHub` is the registration center and execution entry point for framework built-in tools. All innate tools implement the `InnateTool` interface and register with the Hub:

```typescript
interface InnateTool {
  readonly definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<string>;
}
```

`InnateToolHub` responsibilities:
- **Register/unregister** innate tools (register / unregister)
- **Query** tool definitions and description lists (getTools / getToolsDescription)
- **Execute** tool calls (execute)

### 5.3 HubTool — Capability Bridging Pattern

The framework uses **HubTool** to "bridge" other Hubs' capabilities as innate tools. For example, SkillHub and MemoryHub each have multiple operational capabilities (search skills, install skills, retrieve knowledge, etc.), which are wrapped via HubTool and registered with InnateToolHub, allowing the model to uniformly access them through tool calls:

```
SkillHub                          InnateToolHub
  ├─ skill_list      ─ HubTool ─►  register(skill_list)
  ├─ skill_install   ─ HubTool ─►  register(skill_install)
  ├─ skill_load_main ─ HubTool ─►  register(skill_load_main)
  └─ ...

MemoryHub
  ├─ memory_search   ─ HubTool ─►  register(memory_search)
  ├─ memory_save     ─ HubTool ─►  register(memory_save)
  └─ … (conversation_*, memory_*)

KnowledgeHub (optional)
  ├─ knowledge_list   ─ HubTool ─►  register(knowledge_list)
  ├─ knowledge_add    ─ HubTool ─►  register(knowledge_add)
  ├─ knowledge_delete ─ HubTool ─►  register(knowledge_delete)
  └─ knowledge_search ─ HubTool ─►  register(knowledge_search)
```

This way, the model sees a unified innate tool list during the EXECUTE phase, without needing to know which Hub each tool originates from.

### 5.4 SkillHub — Skill Center

The `SkillHub` interface extends IHub, providing skill query, loading, and execution capabilities:

```typescript
interface SkillHub extends IHub {
  /** Returns description text list for all installed skills */
  getSkillsDescription(): string[];
  /** Returns tool definitions provided by the specified skill */
  getTools(skillName: string): ToolDefinition[];
  /** Executes a tool from a specific skill */
  execute(skillName: string, toolName: string, args: Record<string, unknown>): Promise<string>;
}
```

Skill declarations are simplified to name + description:

```typescript
interface SkillDeclaration {
  name: string;
  description: string;
}
```

### 5.5 MemoryHub — Memory Center

The `MemoryHub` interface extends IHub, providing memory retrieval and message tracking capabilities:

```typescript
interface MemoryHub extends IHub {
  searchMemory(query: string): Promise<{ text: string; tokenCount: number }>;
  trackMessage(role: string, content: string): Promise<void>;
}
```

Memory is used at the following points:
- **Before the PERCEIVE phase**: Search for memory related to user input, providing background for task understanding
- **At the start of each PlanStep**: Search for memory related to the current step, providing execution context

### 5.6 Three-Layer Tool Model

```
┌──────────────────────────────────────────────────────┐
│                  Skill Package Tools                  │
│                                                      │
│  Each skill package (Skill) provides:                 │
│  ① Skill description (capability overview)            │
│  ② A set of tools (concrete operations after loading) │
│                                                      │
│  ASSESS phase uses ① to evaluate skill match          │
│  EXECUTE phase uses ② after loading for actual calls  │
├──────────────────────────────────────────────────────┤
│                    Innate Tools                        │
│                                                      │
│  Managed uniformly via InnateToolHub, directly usable │
│  Includes: skill management (search/install/load),    │
│  knowledge retrieval, etc.                            │
│                                                      │
│  Skill management tools are special innate tools —    │
│  they enable the agent to dynamically acquire new     │
│  capabilities during the EXECUTE phase                │
├──────────────────────────────────────────────────────┤
│                 Hub Capability Bridging                │
│                                                      │
│  SkillHub / MemoryHub operations are wrapped via      │
│  HubTool and registered as innate tools, achieving    │
│  a unified tool invocation entry point                │
└──────────────────────────────────────────────────────┘
```

### 5.7 Tool Execution Flow

```
Model outputs tool call intent
    │
    ▼
┌──────────────────────┐
│ 1. Tool existence     │  Is this tool in the current
│    check              │  tool list?
└───────┬──────────────┘          (framework validation)
        │ exists
        ▼
┌──────────────────────┐
│ 2. Permission         │  Delegate to external permission
│    adjudication       │  verification interface
│    DENY → Reject      │  DENY / ASK / ALLOW
│    ASK  → Suspend,    │
│           await user  │
│    ALLOW→ Continue     │        (external interface)
└───────┬──────────────┘
        │ allowed
        ▼
┌──────────────────────┐
│ 3. Parameter safety   │  Delegate to external permission
│    check              │  verification interface
└───────┬──────────────┘          (external interface)
        │ passed
        ▼
┌──────────────────────┐
│ 4. Execute tool       │  Invoke via tool execution
│                       │  interface
└───────┬──────────────┘          (external interface)
        │
        ▼
┌──────────────────────┐
│ 5. Result formatting  │  Truncate overly long output,
│                       │  redact sensitive information
└───────┬──────────────┘          (framework processing)
        │
        ▼
  Return Observation to inner ReAct loop
```

### 5.8 Impact of Permission Adjudication on the Loop

| Adjudication Result | Impact on Loop |
|--------------------|----------------|
| ALLOW | Transparent; tool executes directly, Observation returns normal result |
| DENY | Tool does not execute; Observation returns "insufficient permission" message; model can adjust strategy |
| ASK | Loop suspends, awaiting user authorization; timeout is treated as DENY |

**Key design**: DENY does not terminate the loop. Instead, it's fed back to the model as an Observation, giving the model a chance to choose alternatives. Only unrecoverable errors terminate the loop.

---

## 6. Context Assembly Engine

### 6.1 Design Goals

Every inner ReAct iteration needs to assemble multi-source information into a complete prompt. Core challenge: **Arrange the most valuable information in optimal priority order within the limited model context window**.

### 6.2 Information Layering & Priority

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: System Prompt                                   │
│   Role definition + behavioral norms + thinking mode     │
│   guidance                                               │
│   ──── Always retained, cannot be trimmed ────           │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Available Tool Declarations (Tool Schema)       │
│   Names, descriptions, and parameter definitions of      │
│   innate tools + skill package tools                     │
│   ──── Always retained, cannot be trimmed ────           │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Cognitive Context + Existing ReAct Steps        │
│   User's original input + execution plan + step logs     │
│   ──── Always retained, cannot be trimmed ────           │
├─────────────────────────────────────────────────────────┤
│ Layer 4: External Retrieval Results (sorted by relevance)│
│   Obtained via context retrieval interface               │
│   ──── Trimmable: low-relevance items discarded first ── │
├─────────────────────────────────────────────────────────┤
│ Layer 5: Conversation History (reverse chronological)    │
│   Obtained via conversation history interface            │
│   ──── Trimmable: older records compressed/discarded ──  │
│          first                                           │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Token Budget Allocation

1. **Calculate fixed usage**: Total token count for system prompt + tool declarations + cognitive context
2. **Reserve output space**: Reserve a fixed token budget for model responses
3. **Calculate available budget**: Model context window − fixed usage − output reservation
4. **Fill by priority**: Fill in external retrieval results and conversation history sequentially until the budget is exhausted

### 6.4 Dynamic Compression Strategy

When information exceeds the budget, degrade progressively:

1. **Discard low-scoring retrieval results**
2. **Summarize and compress historical conversations**
3. **Truncate intermediate ReAct steps**: Keep full details for the most recent 3–5 steps; compress earlier steps to single-line summaries

---

## 7. Loop Control & Exception Handling

### 7.1 Step Count Control

Each EXECUTE phase has a configurable maximum step limit (default: 15 steps) to prevent:

- The model getting stuck in repetitive actions
- Meaningless idle cycling
- Unbounded resource consumption

### 7.2 Heartbeat Mechanism

The inner ReAct loop updates a heartbeat timestamp after each step completes. If the heartbeat is not updated within the timeout period, the step is marked as abnormal and can be automatically terminated by the system.

### 7.3 Error Recovery Strategy

**Recoverable errors** (do not terminate the loop):
- Tool call returns an error → Fed back as Observation; model can adjust
- Permission denied → Model can choose alternatives
- Tool returns empty results → Model can refine query conditions

**Unrecoverable errors** (terminate the loop):
- Model API connection failure
- Security sandbox detects a serious violation
- N consecutive actions all fail (configurable threshold)

### 7.4 User Mid-Execution Intervention

| Action | Effect |
|--------|--------|
| Pause | Pause after current step completes; full context preserved; resumable |
| Terminate | Immediately stop; generate termination report |
| Authorization decision | Respond to ASK requests with allow/deny |

### 7.5 Replan Control

When the REFLECT phase determines replanning is needed, it returns to the PLAN phase to formulate a new plan and execute again. The framework sets a **maximum replan count** (default: 2) to prevent infinite loops.

---

## 8. Observability Design

### 8.1 Event System

The framework publishes the entire cognitive cycle process through an event mechanism:

| Event Type | Trigger Timing | Payload |
|-----------|----------------|---------|
| `task:start` | Task begins | Task ID, user input |
| `phase:perceive` | PERCEIVE complete | Perception artifact (includes complexity classification) |
| `phase:assess` | ASSESS complete | Assessment artifact |
| `phase:plan` | PLAN complete | Plan artifact, replan count |
| `planStep:start` | Plan step begins | Step ID, description |
| `step:thought` | Inner ReAct thought | Step number, reasoning content |
| `step:action` | Inner ReAct action | Step number, tool name, arguments |
| `step:observation` | Inner ReAct observation | Step number, result content |
| `step:error` | Model call failure | Step number, error message |
| `planStep:end` | Plan step complete | Step ID, termination reason, output |
| `phase:execute` | EXECUTE complete | ExecuteResult |
| `phase:reflect` | REFLECT complete | Reflection artifact |
| `phase:replan` | Replan triggered | Replan count |
| `task:error` | Unrecoverable error | Error message |

### 8.2 Execution Trace Replay

All step logs and cognitive artifacts are persisted, supporting:

- Complete reproduction of the five-phase cognitive process
- Chronological reconstruction of every thought, action, and observation
- Auditing the model's decision quality at each cognitive phase

### 8.3 Performance Metrics

| Metric | Description |
|--------|-------------|
| Total duration | Total time from PERCEIVE start to final output |
| Per-phase duration | Independent timing for each cognitive phase |
| Execution steps | Total ReAct iteration count across all PlanSteps |
| Plan step count | Total steps produced by PLAN vs. actually executed |
| Replan count | Number of times REFLECT triggered replanning |
| Tool call success rate | Successful calls / total calls |
| Skill acquisition count | Number of skill packages dynamically installed during EXECUTE |
| Token usage | promptTokens + completionTokens (tracked by TokenTracker) |
| Context utilization | Actual tokens used / model window limit |

---

## 9. Framework Extension Points

### 9.1 Integration Interfaces with External Systems

| Interface | Direction | Framework Expectation |
|-----------|-----------|----------------------|
| Model client interface (IModelClient) | Out | Pass in message list and tool declarations, return model response; includes token counting methods |
| Skill center (SkillHub) | Bidirectional | Query skill list, load tool definitions, execute skill tools |
| Memory center (MemoryHub) | Bidirectional | Retrieve relevant memories, track conversation messages |
| Security sandbox (SecuritySandbox) | In | Permission-based execution guard; rule management and permission checking |
| Event publisher interface (IEventPublisher) | Out | Publish cognitive phase events and step events |

### 9.2 Framework Contract Interfaces

```typescript
/** Hub base interface — Unified abstraction for all capability modules */
interface IHub {
  getToolDefinition(toolName: string): ToolDefinition | undefined;
  hasTool(toolName: string): boolean;
}

/** LLM client */
interface IModelClient {
  chat(messages: Message[], tools?: ToolDefinition[]): Promise<ModelResponse>;
  /** Count tokens */
  count(text: string): number;
  countTools(tools: ToolDefinition[]): number;
}

/** Memory center */
interface MemoryHub extends IHub {
  searchMemory(query: string): Promise<{ text: string; tokenCount: number }>;
  trackMessage(role: string, content: string): Promise<void>;
}

/** Skill center */
interface SkillHub extends IHub {
  getSkillsDescription(): string[];
  getTools(skillName: string): ToolDefinition[];
  execute(skillName: string, toolName: string, args: Record<string, unknown>): Promise<string>;
}

/** Event publisher (optional) */
interface IEventPublisher {
  publish(type: string, payload: unknown): void;
}

/** Security sandbox — permission-based execution guard (subclass for custom policy) */
class SecuritySandbox {
  checkPermission(request: PermissionRequest): Promise<PermissionDecision>;
  prepareToolExecution(
    action: ActionCategory,
    toolName: string,
    permissionTarget: string,
    args: Record<string, unknown>,
  ): Promise<string | undefined>;
  askPermission(request: PermissionRequest): Promise<boolean>;
}
```

### 9.2.1 AgentBrain Initialization Options

```typescript
interface AgentBrainOptions {
  model: IModelClient;
  memory: MemoryHub;
  /** Innate tool providers */
  tools: IHub[];
  /** Skill center */
  skills: SkillHub;
  config: AgentConfig;
  /** Custom sandbox (subclass of `SecuritySandbox`); omit to use built-in */
  sandbox?: SecuritySandbox;
  eventPublisher?: IEventPublisher;
}
```

### 9.3 Configuration

| Config | Default | Description |
|--------|---------|-------------|
| systemPrompt | — | System prompt: role definition and behavioral norms |
| modelContextSize | — | Model context window size (token count) |
| maxSteps | 15 | Maximum steps for the inner ReAct loop |
| heartbeatTimeoutMs | 60,000 | Heartbeat timeout threshold |
| maxConsecutiveFailures | 3 | Maximum consecutive failure count |
| maxReplans | 2 | Maximum replan count triggered by REFLECT |
| workingDirectory | — (built-in default under OS temp) | Built-in sandbox only: tool working directory; set on `AgentConfig` |

When `sandbox` is omitted, AgentBrain uses a built-in rule sandbox subclass whose `askPermission` routes to `ask_user`. The class `SecuritySandbox` starts with no rules; when no rule matches, permission is always **ASK**. Rules come from subclasses/wrappers or `addRule` after construction. Direct use: `new SecuritySandbox(workingDirectory?)` (override `askPermission` for custom ASK).

### 9.4 Pluggable Components

| Component | Extension Method | Description |
|-----------|-----------------|-------------|
| Execution Strategy | Strategy pattern | Implement `ExecutionStrategy` interface to define new execution paths (e.g., `FastPathStrategy`, `FullCycleStrategy`) |
| Thinking Mode Scheduler | Replace scheduling strategy | Customize thinking mode weight distribution for each cognitive phase |
| Context Assembly Strategy | Strategy pattern | Replace priority ordering and compression algorithms |
| Termination Condition | Condition chain | Add custom termination conditions |
| Observation Result Formatter | Formatter | Define specialized result formatting for different tool types |
| Security Sandbox | Subclass `SecuritySandbox` or built-in | Override only `askPermission`; base class exposes `workingDirectory` (ASK → `ask_user` when using built-in wiring) |

---

## 10. Example: Complete Cognitive Process

Using "Analyze last month's server performance data and identify performance bottlenecks" as an example:

### Phase 1: PERCEIVE

```
Surface request: Analyze last month's server performance data
Deep intent: Identify performance bottlenecks affecting business to enable targeted optimization
Constraints: Time range is last month, targeting existing servers
Ambiguities: Which servers? Where is performance data obtained? What is the threshold for bottlenecks?
Success criteria: Identify Top 3 performance bottlenecks and provide actionable optimization recommendations
```

### Phase 2: ASSESS

```
Required skills:
  - Server monitoring data reading capability (Prometheus/Grafana queries)
  - Performance analysis methodology (CPU/memory/IO/network analysis framework)
  - Data visualization capability (chart generation)
  - Report writing capability

Matched installed skills:
  ✓ data-analysis (data analysis skill package)
  ✓ chart-generation (chart generation skill package)
  ✗ server-monitoring (server monitoring skill package) — missing

Available innate tools:
  ✓ File read/write, network requests

Risk: Missing server monitoring skill package; may need dynamic acquisition during execution
Complexity: moderate
Feasible: Yes (missing skills can be acquired via innate tools)
```

### Phase 3: PLAN

```
Strategy: First acquire the missing monitoring skill, then collect data, analyze, and generate report

Steps:
  s1: Install server-monitoring skill package (using innate tools)
  s2: Query last month's server performance data (CPU, memory, IO, network)
  s3: Perform statistical analysis on data, identify anomalous patterns
  s4: Generate performance trend charts
  s5: Write analysis report with Top 3 bottlenecks and optimization recommendations
```

### Phase 4: EXECUTE (step-by-step following the plan)

```
═══ PlanStep s1: Install server-monitoring skill package ═══

  [Memory] Search "install monitoring skill query performance data" → No relevant memory
  [Prior Context] None (first step)

  Step 1 [Thought]: First step in plan is to acquire the server-monitoring skill package
  Step 1 [Action]:  skill_list()  → innate tool
  Step 1 [Observe]: Installed skills: data-analysis, chart-generation

  Step 2 [Thought]: Missing server-monitoring, search and install
  Step 2 [Action]:  skill_install("server-monitoring")  → innate tool
  Step 2 [Observe]: Installation successful

  Step 3 [Thought]: Load skill main module to make tools available
  Step 3 [Action]:  skill_load_main("server-monitoring")  → innate tool
  Step 3 [Observe]: Load successful, new tools: query_metrics, analyze_patterns, export_data
                    → skillTools refreshed

  Step 4 [Thought]: Skill package is ready, step complete
  [Output]: server-monitoring skill package installed and loaded, 3 new tools added

═══ PlanStep s2: Query last month's server performance data ═══

  [Memory] Search "query server performance data CPU memory" → Found: "For performance data, confirm time range first"
  [Prior Context] s1 output: server-monitoring skill package installed and loaded

  Step 5 [Thought]: Skill is ready, use query_metrics to query
  Step 5 [Action]:  query_metrics({ period: "last_month", metrics: ["cpu", "memory", "io", "network"] })
                    → skill tool
  Step 5 [Observe]: Returns 30 days of performance data...

  Step 6 [Thought]: Data retrieval complete
  [Output]: 30 days of performance data retrieved, including CPU/memory/IO/network metrics

═══ PlanStep s3: Perform statistical analysis on data ═══
... Depends on s2 output as input ...

═══ PlanStep s4: Generate performance trend charts ═══
... Depends on s3 output ...

═══ PlanStep s5: Write analysis report ═══
... Depends on s3, s4 output ...

  [Output]: Complete report text = ExecuteResult.finalAnswer
```

### Phase 5: REFLECT

```
Goal met: Yes
Strengths: Successfully acquired missing skill and completed analysis; Top 3 bottlenecks accurately identified
Improvements: Could add historical comparison analysis; data sampling granularity could be finer
Lessons: Performance analysis tasks should first confirm data source and monitoring system type
Needs replan: No
```

---

## Appendix A: Key Terminology

| Term | Definition |
|------|------------|
| Outer ReAct | Five-phase cognitive cycle: PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT |
| Inner ReAct | Thought → Action → Observation iterative loop within the EXECUTE phase; one independent loop per PlanStep |
| Cognitive Phase | The five phases of the Outer ReAct, simulating the human brain's cognitive process |
| Cognitive Artifact | Structured output from each cognitive phase (Perception, Assessment, Plan, etc.) |
| Hub | Unified abstraction interface for capability modules (IHub); base class for all capability centers |
| InnateToolHub | Innate tool registration center; manages registration, query, and execution of system built-in tools |
| SkillHub | Skill center; manages skill package query, loading, and tool execution |
| MemoryHub | Memory center; provides memory retrieval and message tracking |
| HubTool | Capability bridge; wraps other Hubs' operations as innate tools registered with InnateToolHub |
| Skill Package (Skill) | Capability unit providing domain knowledge description + a set of tools |
| Innate Tool | System built-in basic tool; managed via InnateToolHub; usable without any skill package |
| PlanStepResult | Execution result of a single plan step; includes step output and ReAct logs |
| Thinking Mode | Four core thinking styles: Creative, Logical, Empathetic Insight, Structural Planning |
| Thinking Mode Scheduler | Component that dynamically weights the four thinking modes based on the current cognitive phase |
| ReAct Behavior Protocol | Constraint text injected into the system prompt, guiding the model to follow the Thought → Action → Observation loop |
| Replan | When REFLECT determines results are unsatisfactory, return to PLAN to formulate a new plan |
| Heartbeat | Liveness marker updated after each inner ReAct step; used for timeout detection |

## Appendix B: External Interface Contracts

The framework does not operate independently; it depends on the following abstract interfaces. Which system implements them is transparent to the framework:

| Interface | Implementor | Input | Output | Purpose |
|-----------|-------------|-------|--------|---------|
| IModelClient | External | Message list + tool declarations | Model response | Reasoning across all cognitive phases |
| SkillHub | External | Skill name + tool name + args | Execution result | Skill management and tool execution |
| MemoryHub | External | Query text / role + content | Memory fragments | Memory retrieval and message tracking |
| IEventPublisher | External (optional) | Event type + payload | — | Observability |
| IHub | Framework internal | Tool name | Tool definition | Hub unified abstraction base class |
