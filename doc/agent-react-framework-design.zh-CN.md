# Agent Brain — 大脑认知框架设计

## 1. 概述

### 1.1 设计哲学

人类面对任何任务——无论是"帮我订一杯咖啡"还是"写一部百万字的小说"——大脑都会经历相同的认知流程，只是简单任务中这些阶段在毫秒内快速流过，几乎无法被察觉。

本框架将智能体的任务处理建模为**模拟人类大脑的五阶段认知循环**：

```
  理解任务        评估能力         分解规划        执行监控         反思优化
 PERCEIVE  →    ASSESS    →     PLAN    →    EXECUTE    →    REFLECT
                                  ↑                              │
                                  └────── 需要重新规划时 ──────────┘
```

这五个阶段不是"复杂任务专属"——**所有任务都经历完整的五阶段**。区别仅在于速度：
- 简单任务（"今天星期几？"）：五阶段在一两秒内流过
- 复杂任务（"设计一个分布式系统"）：每个阶段深入展开，REFLECT 还可能触发回到 PLAN 重新修正

### 1.2 双层 ReAct 架构

框架采用**大小 ReAct 嵌套**的双层架构：

- **大 ReAct**（外层）：五阶段认知循环 PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT，这是大脑的宏观工作流
- **小 ReAct**（内层）：EXECUTE 阶段内部的 Thought → Action → Observation 迭代循环，**每个计划步骤（PlanStep）运行一个独立的小 ReAct 循环**，步骤之间通过输出传递上下文

```
┌────────────────────────────────────────────────────────────┐
│              大 ReAct — 认知循环（外层）                      │
│                                                            │
│  PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT             │
│                                 │                          │
│                    ┌────────────┴────────────┐             │
│                    │  小 ReAct — 执行循环（内层）│             │
│                    │                          │             │
│                    │  每个 PlanStep 独立循环：   │             │
│                    │  Thought → Action → Obs  │             │
│                    │     ↑                 │  │             │
│                    │     └──── 循环 ────────┘  │             │
│                    │                          │             │
│                    │  步骤间传递输出上下文       │             │
│                    └──────────────────────────┘             │
└────────────────────────────────────────────────────────────┘
```

### 1.3 设计目标

本文档定义 Agent Brain 的逻辑设计，聚焦于**单个智能体如何通过认知循环完成一个任务**的完整机制。具体包括：

- 五阶段认知循环的流程与每阶段的职责边界
- 技能（Skill）与工具（Tool）的关系模型
- 小 ReAct 执行循环的控制逻辑
- 四种思维模式的动态调度
- 上下文组装策略
- 循环终止、异常处理与可观测性
- 框架对外暴露的扩展点与集成接口

**不在本文档范围内**的内容：

框架通过抽象接口与外部系统协作。以下系统的内部实现不在关注范围：
- 上下文数据的来源系统及其内部实现（如何存储、检索、归档）
- 工具与技能包的注册与生命周期管理（如何安装、卸载、启动运行时）
- 权限策略的配置与管理
- 模型的接入与适配
- 多智能体的任务拆解与调度编排
- 前端界面布局与交互设计

---

## 2. 五阶段认知循环

### 2.1 总览

框架对每个任务都执行**五阶段认知循环**。第一阶段 PERCEIVE 在理解任务的同时对复杂度进行分类，从而在后续阶段运行前选择合适的**执行策略**：

```
任务输入
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  Phase 1: PERCEIVE — 理解任务 & 分类复杂度         │
│  识别意图、澄清模糊点、定义成功标准，               │
│  同时判断复杂度（simple / complex）              │
│  简单任务：同时产出可直接执行的单步计划（fastPlan） │
├─────────────┬────────────────────────────────────────┘
│             │                                         |
│   简单      │   复杂                                   |
│      │      │      │                                  |
│      ▼      │      ▼                                 |
│  FastPath   │  FullCycle                             |
│  Strategy   │  Strategy                             |
│  EXECUTE    │  ASSESS → PLAN → EXECUTE → REFLECT     |
│      │      │      │                                |
│      ▼      │      ▼                                 |
│   结果      │   结果                                  │
└─────────────┴────────────────────────────────────────┘
```

**快速通道**（简单任务）：PERCEIVE 产出单步计划（`fastPlan`），`FastPathStrategy` 跳过 ASSESS/PLAN/REFLECT，直接进入 EXECUTE。将 LLM 调用从 5+ 次降低到 2 次。

**完整循环**（复杂任务）：`FullCycleStrategy` 按 ASSESS → PLAN → EXECUTE → REFLECT 完整执行。

两种策略均实现 `ExecutionStrategy` 接口，新增执行路径（如 `MediumPathStrategy`）无需修改 `AgentBrain`。

```
任务输入
  │
  ▼
┌──────────────────────────────────────────────────────┐
│  Phase 1: PERCEIVE — 理解任务                         │
│  接收信息、识别意图、澄清模糊点                         │
│  产出：Perception（表层需求 + 深层意图 + 成功标准）      │
└────────────┬─────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────┐
│  Phase 2: ASSESS — 评估能力与资源                     │
│  思考任务所需的知识与技能（不关心自身是否拥有）             │
│  盘点可用工具与技能包，判断匹配度与缺口                   │
│  产出：Assessment（所需技能 + 匹配技能 + 缺失技能 + 风险）│
└────────────┬─────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────┐
│  Phase 3: PLAN — 分解与规划                           │
│  将任务拆解为有序的执行步骤                              │
│  产出：Plan（策略 + 步骤列表 + 依赖关系 + 预期产出）     │
└────────────┬─────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────┐
│  Phase 4: EXECUTE — 执行与监控（小 ReAct 内循环）      │
│  按计划逐步执行，遇障碍灵活调整                          │
│  缺少技能时通过天生技能获取新技能                         │
│  产出：ExecuteResult（执行步骤 + 最终回答）              │
└────────────┬─────────────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────────────┐
│  Phase 5: REFLECT — 反思与优化                        │
│  评估结果、积累经验、处理情绪                            │
│  ├── 达标 → 输出最终结果                               │
│  └── 未达标 → 回到 PLAN 重新规划（最多 2 次）           │
│  产出：Reflection（达标判定 + 经验教训 + 是否重规划）     │
└──────────────────────────────────────────────────────┘
```

### 2.2 Phase 1: PERCEIVE — 理解任务

> 人类类比：接到任务后，大脑首先解析收到的信息——听到了什么？对方真正想要什么？哪里说得不清楚？

**职责**：

- **接收信息**：获取用户的原始输入
- **识别意图**：区分表层请求与深层需求
  - 表层："帮我写一份报告" → 深层：需要什么类型的报告？汇报对象是谁？格式要求？
- **澄清模糊点**：识别任务描述中的歧义
  - 有歧义时，标注出来（后续可主动提问或做合理假设）
- **定义成功标准**：明确什么样的结果才算"完成"
- **分类复杂度**：判断任务是 `simple` 还是 `complex`
  - 简单：单一操作、明确映射到 1-2 个工具调用
  - 复杂：多步骤、有依赖、需要分析/综合、方法不明确
  - 拿不准时分类为 `complex`
- **生成快速计划**（仅简单任务）：产出单步 `fastPlan`，使 ExecutionStrategy 可跳过 ASSESS/PLAN/REFLECT

**产出结构** — `Perception`：

```json
{
  "surfaceRequest": "帮我写一份报告",
  "deepIntent": "需要一份面向技术总监的季度安全审计报告，重点突出风险趋势",
  "constraints": ["截止下周五", "不超过 20 页", "需包含数据图表"],
  "ambiguities": ["未明确是哪个季度", "未说明是否需要中英文双版本"],
  "successCriteria": ["覆盖所有安全事件", "趋势分析有数据支撑", "格式符合公司模板"],
  "complexity": "complex"
}
```

简单任务的产出还包含 `fastPlan`：

```json
{
  "surfaceRequest": "查找 stock 相关的 skill",
  "deepIntent": "从技能仓库搜索股票分析相关的技能",
  "constraints": [],
  "ambiguities": [],
  "successCriteria": ["返回匹配的技能列表"],
  "complexity": "simple",
  "fastPlan": {
    "strategy": "搜索 stock 相关的技能",
    "steps": [{ "id": "s1", "description": "从技能注册表搜索 stock 相关技能", "dependsOn": [] }],
    "expectedOutcome": "匹配的技能列表"
  }
}
```

**思维模式**：以**情感洞察（共情）** 为主导——站在对方角度理解"他真正想要什么"，辅以逻辑思维验证理解的准确性。

### 2.3 Phase 2: ASSESS — 评估能力与资源

> 人类类比：理解任务后，大脑进行**元认知**——这个任务需要什么知识和技能？我有没有？没有的话去哪里找？难度如何？风险多大？

**核心原则**：ASSESS 阶段首先**从任务出发思考所需的知识和技能**，这与自身当前是否拥有这些技能无关。先想清楚"需要什么"，再盘点"有什么"，最后判断"差什么"。

**职责**：

1. **需求分析**（从任务出发）：
   - 完成这个任务需要哪些**领域知识**？（如：安全审计知识、数据分析能力、图表生成）
   - 需要哪些**操作技能**？（如：文件读写、数据库查询、PDF 生成）
   - 需要哪些**外部资源**？（如：历史安全数据、公司模板、审计标准文档）

2. **能力盘点**（自身资源匹配）：
   - **已有技能包**：当前已安装的技能包有哪些？它们覆盖哪些领域？
   - **天生工具**：系统内建的基础工具（文件操作、网络请求等），无需技能包即可使用
   - **匹配度判断**：将所需技能与已有技能对照，标注匹配/缺失

3. **风险判断**：
   - 任务复杂度评级：`simple` / `moderate` / `complex`
   - 可行性判断：是否有能力完成？如果不完全可行，差距在哪里？
   - 失败后果评估：做错了会怎样？

**产出结构** — `Assessment`：

```json
{
  "capabilityMatch": "需要安全审计和报告生成能力，当前具备数据分析和文件管理技能",
  "skillCategories": ["security-audit", "report-generation"],
  "matchedSkillCategories": ["data-analysis", "file-management"],
  "missingSkillCategories": ["security-audit"],
  "risks": ["缺少安全审计领域知识可能导致专业术语使用不当", "历史数据不完整可能影响趋势分析"],
  "complexity": "moderate",
  "feasible": true
}
```

**思维模式**：以**逻辑性思维**为主导——客观、诚实地评估能力匹配度，辅以结构规划思维系统化地盘点资源。

#### 2.3.1 技能（Skill）与工具（Tool）的关系

在 ASSESS 阶段，理解技能和工具的区别至关重要：

```
┌──────────────────────────────────────────────────────┐
│                  技能包 (Skill)                        │
│                                                      │
│  领域知识：安全审计的方法论、标准框架、专业术语           │
│  ──────────────────────────────────────────────       │
│  Tool A: query_security_events（查询安全事件）          │
│  Tool B: generate_risk_matrix（生成风险矩阵）           │
│  Tool C: format_audit_report（格式化审计报告）           │
│                                                      │
│  → 知道在什么场景下、以什么顺序、用什么参数调用这些工具    │
│  → 通过 SkillHub 管理，使用 skill_load_main 加载后可用   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                  天生工具 (Innate Tool)                │
│                                                      │
│  通过 InnateToolHub 统一注册和管理                      │
│  包括：技能管理工具、知识检索工具等                      │
│                                                      │
│  → 基础能力，不需要领域知识就能使用                      │
└──────────────────────────────────────────────────────┘
```

**关键洞察**：大部分工具并非独立可用——它们需要结合对应的**技能包**才知道怎么用、什么时候用、用什么参数。技能包提供的不仅是工具，更是**领域知识和使用范式**。

类比人类：厨刀（工具）谁都能拿起来，但只有具备烹饪技能的人才知道什么时候用什么刀、怎么切、切多大。

### 2.4 Phase 3: PLAN — 分解与规划

> 人类类比：想清楚需要什么之后，大脑开始制定行动计划——先做什么、后做什么、哪些可以并行、哪些有依赖。

**职责**：

- **任务分解**：将大任务拆解为若干有序的小步骤
  - 简单任务可能只有 1-2 步，不需要过度拆解
  - 复杂任务需要多层分解，标注步骤间的依赖关系
- **设定目标**：明确每个步骤的预期产出和阶段性成果
- **制定计划**：安排步骤的执行顺序，考虑依赖关系

**产出结构** — `Plan`：

```json
{
  "strategy": "先收集历史安全数据，再进行趋势分析，最后生成格式化报告",
  "steps": [
    { "id": "s1", "description": "查询最近一个季度的安全事件日志", "dependsOn": [] },
    { "id": "s2", "description": "对安全事件进行分类和统计分析", "dependsOn": ["s1"] },
    { "id": "s3", "description": "生成风险趋势图表", "dependsOn": ["s2"] },
    { "id": "s4", "description": "按公司模板格式生成审计报告", "dependsOn": ["s2", "s3"] }
  ],
  "expectedOutcome": "一份完整的季度安全审计报告，包含事件统计、趋势分析和风险评估"
}
```

**思维模式**：以**结构规划（工程思维）** 为主导——系统化地分解任务结构和依赖关系，辅以创造性思维探索多种可能的执行路径。

### 2.5 Phase 4: EXECUTE — 执行与监控

> 人类类比：计划制定好了，开始动手做。做的过程中不断检查进度，遇到问题就调整方法。**这里才涉及自身是否真的有对应的知识和技能**——如果没有，就要去学习或寻求帮助。

EXECUTE 阶段运行**小 ReAct 内循环**——这是实际"动手做事"的阶段。

#### 2.5.1 按计划步骤逐步执行

EXECUTE 阶段不是一个整体的大循环，而是**按 PLAN 阶段产出的步骤列表，逐步执行**。每个计划步骤（PlanStep）运行一个独立的 ReAct 循环，上一步的输出自动注入下一步作为上下文：

```
  Plan = [s1, s2, s3, s4]

  s1: ─ ReAct(s1) ─► output_1
                        │
  s2: ─ ReAct(s2, output_1) ─► output_2
                                  │
  s3: ─ ReAct(s3, output_2) ─► output_3
                                  │
  s4: ─ ReAct(s4, output_2, output_3) ─► output_4 = 最终答案
```

每个 PlanStep 内的 ReAct 循环：

```
          ┌───────────┐
          │   思考     │  基于当前步骤目标和已有上下文推理
          │ (Thought)  │  输出：状态分析、下一步决策
          └─────┬─────┘
                │
                ▼
          ┌───────────┐
          │   行动     │  执行工具调用或生成回答
          │ (Action)   │  输出：工具调用意图 或 最终回复
          └─────┬─────┘
                │
                ▼
          ┌───────────┐
          │   观察     │  接收行动的执行结果
          │(Observation)│  输出：工具返回值 或 错误信息
          └─────┬─────┘
                │
         ┌──────┴──────┐
         │ 步骤完成？    │
         ├── 否 → 思考  │
         └── 是 → 返回  │
```

**关键设计**：

- 每个 PlanStep 拥有独立的消息历史，不会被其他步骤的中间过程干扰
- 前置步骤的输出通过 `[Prior Step Outputs]` 注入当前步骤的 user prompt
- 记忆（Memory）在每个 PlanStep 开始时检索一次，作为该步骤的初始上下文
- 某个步骤异常终止时，后续步骤不再执行

**关键区别**：与 ASSESS 阶段不同，EXECUTE 阶段**直接面对自身能力的现实**：

- **有技能** → 直接调用对应工具执行
- **没有技能** → 需要**获取**新的知识和技能

#### 2.5.2 技能获取——系统天生技能

当执行过程中发现缺少某项技能时，智能体可以通过**系统天生技能**来获取：

```
执行中发现缺少 security-audit 领域知识
    │
    ▼
┌──────────────────────────────────┐
│  调用天生技能：搜索/安装技能包      │
│  search_skills("security audit") │
│  install_skill("security-audit") │
└────────────┬─────────────────────┘
             ▼
  新技能包加载完成，新工具可用
    │
    ▼
  继续执行任务
```

**天生工具**是系统内建的基础能力，属于智能体的"先天能力"，不依赖任何外部技能包。通过 `InnateToolHub` 统一注册和管理：

| 天生工具 | 工具名 | 说明 |
|---------|--------|------|
| 技能列表 | `skill_list` | 列出当前已安装的技能包及其能力描述 |
| 安装技能 | `skill_install` | 动态加载技能包 |
| 加载主技能 | `skill_load_main` | 加载技能的主模块，使其工具可用 |
| 加载引用技能 | `skill_load_reference` | 加载技能的引用/辅助模块 |
| 列出技能工具 | `skill_list_tools` | 列出某个技能包提供的所有工具 |

在 `AgentBrain` 构造时传入 **KnowledgeHub** 后，还会注册四个知识库天生工具：

| 天生工具 | 工具名 | 说明 |
|---------|--------|------|
| 知识列表 | `knowledge_list` | 列出条目（可选 **source** 过滤） |
| 知识新增 | `knowledge_add` | 新建条目（**source**、**title**、**content**；可选 **metadata**） |
| 知识删除 | `knowledge_delete` | 按 **id** 删除 |
| 知识检索 | `knowledge_search` | 对知识库内容做语义检索（**query**；可选 **topK**） |

类比人类：人天生会走路、会抓东西、会说话（天生技能），但做饭、编程、弹钢琴需要后天学习（技能包）。学习本身依赖天生技能——用眼睛看教程、用手操练。

#### 2.5.3 执行过程中的自我监控

小 ReAct 循环在执行过程中持续进行自我监控：

- **进度检查**：当前进度是否符合计划？
- **障碍识别**：是否遇到预料之外的问题？
- **策略调整**：遇到障碍时灵活调整——换一个工具、换一种方法、查资料、获取新技能
- **质量把关**：每步产出是否达到预期标准？

#### 2.5.4 执行终止条件

| 终止条件 | 触发方式 | 结果状态 |
|---------|---------|---------|
| 模型输出最终回复 | 判定任务完成，不再发起工具调用 | 正常完成 |
| 达到最大步数 | 循环次数超过预设上限（默认 15 步） | 异常终止 |
| 用户主动终止 | 用户在执行过程中点击终止 | 人工终止 |
| 不可恢复错误 | 连续多次工具调用失败等 | 异常终止 |
| 心跳超时 | 单步骤执行时间超过阈值 | 异常终止 |

**产出结构** — `ExecuteResult`：

```json
{
  "status": "COMPLETED",
  "finalAnswer": "已生成季度安全审计报告，文件保存在 /reports/Q3-2026-security-audit.pdf",
  "steps": [ /* 所有步骤的 Thought/Action/Observation 日志 */ ],
  "planStepResults": [
    { "stepId": "s1", "output": "...", "terminationReason": "COMPLETED", "steps": [...] },
    { "stepId": "s2", "output": "...", "terminationReason": "COMPLETED", "steps": [...] }
  ],
  "terminationReason": "COMPLETED"
}
```

**思维模式**：以**逻辑性思维**为主导——严谨、有序地执行计划，辅以创造性思维灵活应对意外障碍。

### 2.6 Phase 5: REFLECT — 反思与优化

> 人类类比：做完事情后回顾——做得好不好？哪里可以改进？学到了什么？下次遇到类似的事能不能做得更好？

**职责**：

- **结果评估**：将执行结果与 PERCEIVE 阶段定义的成功标准对照
  - 是否达到了预期？哪些标准满足了，哪些没有？
- **经验积累**：总结本次任务的经验教训
  - 什么方法有效？什么方法不行？有没有发现更好的做法？
  - 这些经验可存入长期记忆，用于未来类似任务
- **情绪调节**：处理任务结果带来的"满足感"或"挫败感"
  - 成功时：增强对类似任务的信心权重
  - 失败时：分析原因，避免过度自我否定，聚焦于可改进点
- **重新规划决策**：如果结果未达标，判断是否需要回到 PLAN 重新规划
  - 需要重新规划 → 回到 PLAN 阶段（最多重试 2 次）
  - 已尽力或问题不可解 → 输出当前最佳结果并说明不足

**产出结构** — `Reflection`：

```json
{
  "goalMet": true,
  "strengths": ["数据收集全面", "趋势分析图表清晰"],
  "improvements": ["报告中专业术语可以更准确", "可以增加同比分析"],
  "lessonsLearned": ["安全审计报告应优先确认数据时间范围", "图表生成前先确认数据格式"],
  "needsReplan": false
}
```

**思维模式**：**逻辑性思维 + 情感洞察**并重——逻辑用于客观评估结果，情感用于感受产出的质量和用户可能的满意度，辅以创造性思维寻找改进思路。

---

## 3. 四种核心思维模式

### 3.1 思维模式概述

大脑在不同认知阶段会自然激活不同的思维方式。框架将其抽象为四种核心思维模式，通过**思维模式调度器**在五个阶段动态配比：

#### 创造性思维（发散模式 CREATIVE）

- **功能**：打破常规、产生新颖想法、建立意外联系
- **运作方式**：
  - 生成多个候选方案而非直接锁定一个
  - 借助类比与隐喻拓展思路空间
  - 允许"不完美"的中间想法，后续再筛选收敛
- **输出形态**：创意候选列表、灵感关联图、可能性空间探索

#### 逻辑性思维（收敛模式 LOGICAL）

- **功能**：推理因果、验证一致性、构建严密结构
- **运作方式**：
  - 从候选方案中筛选最优
  - 检查结构的完备性与自洽性
  - 推演因果链条，排除逻辑矛盾
- **输出形态**：结构化方案、依赖关系图、逻辑校验报告

#### 情感洞察（共情模式 EMPATHETIC）

- **功能**：理解人的情绪、审美偏好与深层需求
- **运作方式**：
  - 站在用户视角评估产出的感受
  - 揣摩对方没有说出口的真实需求
  - 评判审美品质与情感共鸣度
- **输出形态**：用户体验预期、需求洞察分析

#### 结构规划（工程模式 STRUCTURAL）

- **功能**：分解任务、排列优先级、管理依赖与资源
- **运作方式**：
  - 将模糊目标拆解为明确的可执行单元
  - 识别任务间的依赖关系与并行机会
  - 分配优先级与资源预算
- **输出形态**：任务分解树、执行顺序表、里程碑计划

### 3.2 思维模式的动态调度

框架通过**思维模式调度器**为每个认知阶段配比不同的思维模式权重：

| 认知阶段 | 主导思维模式 | 辅助思维模式 | 说明 |
|---------|------------|------------|------|
| PERCEIVE | 情感洞察 (50%) | 逻辑性 (25%) | 站在对方角度理解需求，逻辑验证理解正确性 |
| ASSESS | 逻辑性 (45%) | 结构规划 (40%) | 客观分析能力匹配，系统盘点资源 |
| PLAN | 结构规划 (50%) | 逻辑性 (25%)、创造性 (20%) | 工程化分解为主，保留创意空间 |
| EXECUTE | 逻辑性 (50%) | 结构规划 (25%) | 严谨执行为主，有序推进 |
| REFLECT | 逻辑性 (35%) | 情感洞察 (30%) | 逻辑评估结果，情感感受质量 |

模型在每个阶段的系统提示词中注入思维模式引导，例如：

> "当前处于 PERCEIVE 阶段，请优先运用情感洞察理解用户的真实需求——他说的和他想要的可能不完全一致。用逻辑思维验证你的理解是否自洽。"

### 3.3 认知产物与生命周期

五个阶段各自产出结构化的**认知产物**，贯穿整个任务生命周期：

| 阶段 | 认知产物 | 内容 | 生命周期 |
|------|---------|------|---------|
| PERCEIVE | Perception | 表层需求、深层意图、约束、模糊点、成功标准 | 任务全程有效 |
| ASSESS | Assessment | 能力匹配、匹配技能、缺失技能、风险、复杂度 | 任务全程有效 |
| PLAN | Plan | 策略、步骤列表、依赖关系、预期产出 | 当前轮次有效，REFLECT 可触发修订 |
| EXECUTE | ExecuteResult | 所有步骤日志、各 PlanStep 独立结果、最终回答 | 当前轮次有效 |
| EXECUTE（子） | PlanStepResult | 单个计划步骤的 ReAct 日志和输出 | 该步骤结束后输出传递给依赖步骤 |
| REFLECT | Reflection | 达标判定、优劣分析、经验教训、是否重规划 | 触发经验存储或 PLAN 修订 |

---

## 4. 小 ReAct 执行循环详细设计

### 4.1 按步骤执行的循环结构

小 ReAct 在 EXECUTE 阶段内部运行，**每个计划步骤（PlanStep）拥有一个独立的 Thought → Action → Observation 循环**。ReactLoop 按依赖顺序遍历计划步骤，逐步执行：

```
ReactLoop.run(plan)
    │
    ├── for each planStep in plan.steps:
    │       │
    │       ├── 收集依赖步骤的输出（priorContext）
    │       ├── 检索记忆（MemoryHub.searchMemory）
    │       ├── 构建 system prompt + user prompt
    │       │
    │       └── runPlanStep(planStep, priorContext):
    │               │
    │               ├── Thought → Action → Observation 循环
    │               │       │
    │               │       ├── THOUGHT: 模型推理
    │               │       ├── ACTION: 工具调用（天生工具 → 技能工具）
    │               │       └── OBSERVATION: 接收结果
    │               │
    │               └── 步骤完成 → PlanStepResult
    │
    └── 所有步骤完成 → ExecuteResult
```

每个 PlanStep 的 ReAct 循环中：

1. **Thought（思考）**：模型接收当前步骤的上下文，输出推理过程
   - 当前状态分析
   - 下一步计划
   - 是否需要使用工具

2. **Action（行动）**：根据思考结果执行操作
   - **工具调用**：选择工具并提供参数
   - **最终回复**：判定步骤完成，输出步骤结果（循环终止）

3. **Observation（观察）**：接收行动结果
   - 天生工具优先匹配（`InnateToolHub.hasTool()`）
   - 天生工具不存在 → 回退到技能工具（`SkillHub.execute()`）
   - 工具调用失败 → 返回错误信息
   - 特殊处理：`skill_load_main` / `skill_load_reference` 执行后，刷新该技能提供的工具列表

### 4.2 内层 ReAct 循环（提示词模板）

ReactLoop 使用已注册的模板 `react/plan_step_system`（`src/prompts/react/plan-step-system.md`）拼装 PlanStep 的 **system** 提示词；其中通过 `{{include:react/inter-react-loop.md}}` 展开内层 Thought → Action → Observation 规则（并包含技能 / 回忆相关片段）。内层模板标题行为 `[Inter ReAct loop]`。

### 4.3 执行上下文注入

每个 PlanStep 的 ReAct 循环接收丰富的上下文：

**System 提示词** — 由 `buildPlanStepSystemPrompt` → `renderPrompt('react.plan_step_system', …)` 渲染（占位符 + 可选段落）：

| 层级 | 内容 | 来源 |
|------|------|------|
| 1 | 系统提示词（角色定位 + 行为规范） | 外层 `ReactLoopContext.systemPrompt`（AgentBrain 的 EXECUTE 阶段拼接文本） |
| 2 | 内层 ReAct 规则（及 include 片段） | `react/plan-step-system.md` → `react/inter-react-loop.md` |
| 3 | 思维模式引导 | `ReactLoopContext.thinkingGuidance` |
| 4 | 执行计划概览（所有步骤及依赖） | `Plan`（`ReactLoop.buildPlanOverviewText`） |
| 5 | 当前步骤说明 | `PlanStep` |
| 6 | 已安装技能目录（可选） | `SkillHub.getSkillsDescription()` |
| 7 | 技能缺口提示（可选） | `Assessment.missingSkillCategories` |
| 8 | 记忆上下文（可选） | 针对该步骤的 `MemoryHub.memory_search` |

**User Prompt 组装**：

| 层级 | 内容 | 来源 |
|------|------|------|
| 1 | 执行策略 | Plan.strategy |
| 2 | 当前步骤目标 | PlanStep.description |
| 3 | 前置步骤输出 | 依赖步骤的 PlanStepResult.output |
| 4 | 预期总产出 | Plan.expectedOutcome |
| 5 | 行动指令 | 固定文本 |

**可用工具**（通过 `tools` 参数传递给模型）：

- 天生工具：`InnateToolHub.getTools()`（固定不变）
- 技能工具：`SkillHub.getTools(skillName)`（加载技能后动态追加）

### 4.4 工具路由与执行

当模型输出工具调用意图（ToolCallIntent）时，ReactLoop 按以下顺序路由：

```
模型输出: call tool "X" with args {...}
    │
    ├── 免检工具（ask_user、memory_*、skill_* 等）？
    │       │
    │       ├── 是 → 跳过沙箱，直接执行
    │       │
    │       └── 否 → SecuritySandbox.checkPermission(action, target)
    │                   │
    │                   ├── DENY → 将拒绝信息作为 Observation 返回
    │                   ├── ASK  → 向用户确认；拒绝则作为 Observation
    │                   └── ALLOW / 用户批准 → 继续执行
    │
    ├── InnateToolHub.hasTool("X")?
    │       │
    │       ├── YES → InnateToolHub.execute("X", args)
    │       │           │
    │       │           └── 特殊处理: skill_load_main / skill_load_reference
    │       │                 → 刷新 skillTools = SkillHub.getTools(skillName)
    │       │
    │       └── NO → SkillHub.execute(skillName, "X", args)
    │
    └── 执行结果 → Observation → 加入消息历史
```

沙箱权限检查**集中在 ReactLoop 中**，在任何工具分发之前执行。每个天生工具通过 `InnateTool` 接口自声明其 `actionCategory` 和 `permissionTargetArgs`，因此路由逻辑不需要硬编码映射（开闭原则）。技能工具默认使用 `skill_exec` 操作类别。

### 4.5 步骤日志结构

每个步骤产生一条结构化日志：

| 字段 | 说明 |
|------|------|
| stepNumber | 当前是第几轮循环 |
| cognitivePhase | 固定为 EXECUTE |
| phase | THOUGHT / ACTION / OBSERVATION |
| content | 该阶段的文本输出 |
| toolName | 工具名称（ACTION 阶段） |
| toolArguments | 工具参数（ACTION 阶段） |
| timestamp | 时间戳 |

### 4.6 单步骤执行结果

每个 PlanStep 完成后产出 `PlanStepResult`：

```json
{
  "stepId": "s2",
  "steps": [ /* 该步骤的 Thought/Action/Observation 日志 */ ],
  "output": "步骤的最终输出文本",
  "terminationReason": "COMPLETED"
}
```

`output` 字段是该步骤的产出，会被注入到依赖它的后续步骤的 user prompt 中。

---

## 5. Hub 架构与工具技能集成

### 5.1 Hub 统一抽象

框架通过 **IHub** 基础接口统一抽象了工具、技能和记忆三大能力模块。每个 Hub 都可以声明自己拥有哪些工具，并提供工具定义查询能力：

```typescript
/** Hub 基础接口 */
interface IHub {
  getToolDefinition(toolName: string): ToolDefinition | undefined;
  hasTool(toolName: string): boolean;
}
```

框架中有三个核心 Hub：

```
┌──────────────────────────────────────────────────────┐
│                 IHub（基础接口）                        │
│   getToolDefinition(name) / hasTool(name)             │
├────────────┬────────────────┬─────────────────────────┤
│            │                │                         │
│  InnateToolHub     SkillHub          MemoryHub        │
│  （天生工具）       （技能中心）        （记忆中心）     │
│  register()       getSkillsDesc()   searchMemory()    │
│  getTools()       getTools(skill)   trackMessage()    │
│  execute()        execute()                           │
└────────────┴────────────────┴─────────────────────────┘
```

### 5.2 InnateToolHub — 天生工具中心

`InnateToolHub` 是框架内建工具的注册中心和执行入口。所有天生工具实现 `InnateTool` 接口后注册到 Hub 中：

```typescript
interface InnateTool {
  readonly definition: ToolDefinition;
  execute(args: Record<string, unknown>): Promise<string>;
}
```

`InnateToolHub` 的职责：
- **注册/注销**天生工具（register / unregister）
- **查询**工具定义和描述列表（getTools / getToolsDescription）
- **执行**工具调用（execute）

### 5.3 HubTool — 能力桥接模式

框架通过 **HubTool** 将其他 Hub 的能力"桥接"为天生工具。例如，SkillHub 和 MemoryHub 各自拥有多项操作能力（搜索技能、安装技能、检索知识等），通过 HubTool 包装后注册到 InnateToolHub，使模型可以统一通过工具调用的方式使用它们：

```
SkillHub                          InnateToolHub
  ├─ skill_list      ─ HubTool ─►  register(skill_list)
  ├─ skill_install   ─ HubTool ─►  register(skill_install)
  ├─ skill_load_main ─ HubTool ─►  register(skill_load_main)
  └─ ...

MemoryHub
  ├─ memory_search   ─ HubTool ─►  register(memory_search)
  ├─ memory_save     ─ HubTool ─►  register(memory_save)
  └─ …（conversation_*、memory_* 等）

KnowledgeHub（可选）
  ├─ knowledge_list   ─ HubTool ─►  register(knowledge_list)
  ├─ knowledge_add    ─ HubTool ─►  register(knowledge_add)
  ├─ knowledge_delete ─ HubTool ─►  register(knowledge_delete)
  └─ knowledge_search ─ HubTool ─►  register(knowledge_search)
```

这样，模型在 EXECUTE 阶段看到的是一个统一的天生工具列表，无需感知底层来自哪个 Hub。

### 5.4 SkillHub — 技能中心

`SkillHub` 接口扩展 IHub，提供技能的查询、加载和执行能力：

```typescript
interface SkillHub extends IHub {
  /** 返回所有已安装技能的描述文本列表 */
  getSkillsDescription(): string[];
  /** 返回指定技能提供的工具定义 */
  getTools(skillName: string): ToolDefinition[];
  /** 执行某个技能中的工具 */
  execute(skillName: string, toolName: string, args: Record<string, unknown>): Promise<string>;
}
```

技能声明简化为名称 + 描述：

```typescript
interface SkillDeclaration {
  name: string;
  description: string;
}
```

### 5.5 MemoryHub — 记忆中心

`MemoryHub` 接口扩展 IHub，提供记忆检索和消息追踪能力：

```typescript
interface MemoryHub extends IHub {
  searchMemory(query: string): Promise<{ text: string; tokenCount: number }>;
  trackMessage(role: string, content: string): Promise<void>;
}
```

记忆在以下时机被使用：
- **PERCEIVE 阶段前**：搜索与用户输入相关的记忆，作为理解任务的背景
- **每个 PlanStep 开始时**：搜索与当前步骤相关的记忆，作为执行上下文

### 5.6 三层工具模型

```
┌──────────────────────────────────────────────────────┐
│                     技能包工具                         │
│                                                      │
│  每个技能包 (Skill) 提供：                              │
│  ① 技能描述（这个技能包的能力说明）                      │
│  ② 一组工具（加载后可用的具体操作）                      │
│                                                      │
│  ASSESS 阶段评估技能匹配度时使用 ①                     │
│  EXECUTE 阶段加载后实际调用时使用 ②                     │
├──────────────────────────────────────────────────────┤
│                     天生工具                           │
│                                                      │
│  通过 InnateToolHub 统一管理，直接可用                   │
│  包括：技能管理（搜索/安装/加载）、知识检索等              │
│                                                      │
│  其中技能管理工具是特殊的天生工具——                       │
│  它让智能体能在 EXECUTE 阶段动态获取新能力               │
├──────────────────────────────────────────────────────┤
│                   Hub 能力桥接                         │
│                                                      │
│  SkillHub / MemoryHub 的操作通过 HubTool 包装          │
│  注册为天生工具，实现统一的工具调用入口                    │
└──────────────────────────────────────────────────────┘
```

### 5.7 工具执行流程

```
模型输出工具调用意图
    │
    ▼
┌──────────────────────┐
│ 1. 工具存在性校验      │  该工具是否在当前工具列表中？
└───────┬──────────────┘          （框架自身校验）
        │ 存在
        ▼
┌──────────────────────┐
│ 2. 权限裁决            │  委托外部权限校验接口
│    DENY → 拒绝         │  DENY / ASK / ALLOW
│    ASK  → 挂起等待用户  │
│    ALLOW→ 继续          │        （外部接口）
└───────┬──────────────┘
        │ 允许执行
        ▼
┌──────────────────────┐
│ 3. 参数安全校验        │  委托外部权限校验接口
└───────┬──────────────┘          （外部接口）
        │ 通过
        ▼
┌──────────────────────┐
│ 4. 执行工具            │  通过工具执行接口调用
└───────┬──────────────┘          （外部接口）
        │
        ▼
┌──────────────────────┐
│ 5. 结果格式化          │  截断过长输出、脱敏敏感信息
└───────┬──────────────┘          （框架自身处理）
        │
        ▼
  返回 Observation 给小 ReAct 循环
```

### 5.8 权限裁决对循环的影响

| 裁决结果 | 对循环的影响 |
|---------|------------|
| ALLOW | 无感，工具直接执行，Observation 返回正常结果 |
| DENY | 工具不执行，Observation 返回"权限不足"信息，模型可调整策略 |
| ASK | 循环挂起，等待用户授权；超时则视为 DENY |

**关键设计**：DENY 不导致循环终止，而是作为 Observation 反馈给模型，让模型有机会选择替代方案。只有不可恢复的错误才终止循环。

---

## 6. 上下文组装引擎

### 6.1 设计目标

每一轮小 ReAct 迭代都需要将多源信息组装为完整的提示词。核心挑战：**在有限的模型上下文窗口内，以最优先级排列最有价值的信息**。

### 6.2 信息分层与优先级

```
┌─────────────────────────────────────────────────────────┐
│ 第 1 层：系统提示词 (System Prompt)                       │
│   角色定位 + 行为规范 + 思维模式引导                       │
│   ──── 始终保留，不可裁剪 ────                             │
├─────────────────────────────────────────────────────────┤
│ 第 2 层：可用工具声明 (Tool Schema)                        │
│   天生工具 + 技能包工具的名称、描述、参数定义                │
│   ──── 始终保留，不可裁剪 ────                             │
├─────────────────────────────────────────────────────────┤
│ 第 3 层：认知上下文 + 已有 ReAct 步骤                      │
│   用户原始输入 + 执行计划 + 步骤日志                        │
│   ──── 始终保留，不可裁剪 ────                             │
├─────────────────────────────────────────────────────────┤
│ 第 4 层：外部检索结果（按相关度排序）                        │
│   通过上下文检索接口获取                                    │
│   ──── 可裁剪：相关度低的优先丢弃 ────                      │
├─────────────────────────────────────────────────────────┤
│ 第 5 层：对话历史（按时间倒序）                              │
│   通过对话历史接口获取                                      │
│   ──── 可裁剪：较早记录优先压缩或丢弃 ────                   │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Token 预算分配

1. **计算固定占用**：系统提示词 + 工具声明 + 认知上下文的 Token 总数
2. **预留输出空间**：为模型回复预留固定 Token 额度
3. **计算可用预算**：模型上下文窗口 - 固定占用 - 输出预留
4. **按优先级填充**：依次填入外部检索结果与对话历史，直至预算耗尽

### 6.4 动态压缩策略

信息超出预算时，逐级降级：

1. **丢弃低分检索结果**
2. **摘要压缩历史对话**
3. **截断 ReAct 中间步骤**：保留最近 3-5 步完整详情，更早步骤压缩为单行摘要

---

## 7. 循环控制与异常处理

### 7.1 步数控制

每个 EXECUTE 阶段有最大步数上限（可配置，默认 15 步），防止：

- 模型陷入重复行动
- 无意义的空转
- 资源被无限占用

### 7.2 心跳机制

小 ReAct 循环在每个步骤完成后更新心跳时间戳。超时未更新则标记异常，可被系统自动终止。

### 7.3 错误恢复策略

**可恢复错误**（不终止循环）：
- 工具调用返回错误 → 作为 Observation 反馈，模型可调整
- 权限被拒绝 → 模型可选择替代方案
- 工具返回空结果 → 模型可细化查询条件

**不可恢复错误**（终止循环）：
- 模型 API 连接失败
- 安全沙箱检测到严重违规
- 连续 N 次行动均失败（可配置阈值）

### 7.4 用户中途干预

| 操作 | 效果 |
|------|------|
| 暂停 | 当前步骤完成后暂停，保留完整上下文，可恢复 |
| 终止 | 立即停止，生成终止报告 |
| 授权决策 | 对 ASK 请求回应允许/拒绝 |

### 7.5 重规划控制

REFLECT 阶段判定需重规划时，回到 PLAN 阶段重新制定计划并再次执行。框架设置**最大重规划次数**（默认 2 次），防止无限循环。

---

## 8. 可观测性设计

### 8.1 事件体系

框架通过事件机制发布认知循环的全过程：

| 事件类型 | 触发时机 | 携带信息 |
|---------|---------|---------|
| `task:start` | 任务开始 | 任务 ID、用户输入 |
| `phase:perceive` | PERCEIVE 完成 | Perception 产物（包含复杂度分类） |
| `phase:assess` | ASSESS 完成 | Assessment 产物 |
| `phase:plan` | PLAN 完成 | Plan 产物、重规划次数 |
| `planStep:start` | 计划步骤开始 | 步骤 ID、描述 |
| `step:thought` | 小 ReAct 思考 | 步骤号、推理内容 |
| `step:action` | 小 ReAct 行动 | 步骤号、工具名、参数 |
| `step:observation` | 小 ReAct 观察 | 步骤号、结果内容 |
| `step:error` | 模型调用失败 | 步骤号、错误信息 |
| `planStep:end` | 计划步骤完成 | 步骤 ID、终止原因、输出 |
| `phase:execute` | EXECUTE 完成 | ExecuteResult |
| `phase:reflect` | REFLECT 完成 | Reflection 产物 |
| `phase:replan` | 触发重规划 | 重规划次数 |
| `task:error` | 不可恢复错误 | 错误信息 |

### 8.2 执行轨迹回放

所有步骤日志和认知产物持久化存储，支持：

- 完整重现五阶段认知过程
- 按时间顺序还原每一步的思考、行动与观察
- 审计模型在每个认知阶段的决策质量

### 8.3 性能度量

| 指标 | 说明 |
|------|------|
| 总耗时 | 从 PERCEIVE 开始到最终输出的总时间 |
| 各阶段耗时 | 每个认知阶段的独立耗时 |
| 执行步数 | 所有 PlanStep 的 ReAct 迭代总轮数 |
| 计划步骤数 | PLAN 产出的步骤总数与实际执行数 |
| 重规划次数 | REFLECT 触发了几次重规划 |
| 工具调用成功率 | 成功次数 / 总调用次数 |
| 技能获取次数 | EXECUTE 阶段动态安装了几个技能包 |
| Token 使用量 | promptTokens + completionTokens（由 TokenTracker 统计） |
| 上下文利用率 | 实际使用 Token / 模型窗口上限 |

---

## 9. 框架扩展点

### 9.1 与外部系统的集成接口

| 接口 | 方向 | 框架的期望 |
|------|------|-----------|
| 模型调用接口 (IModelClient) | 出 | 传入消息列表与工具声明，返回模型回复 |
| Token 计数接口 (ITokenCounter) | 入 | 计算文本和工具声明的 token 数，用于预算管理 |
| 技能中心 (SkillHub) | 双向 | 查询技能列表、加载工具定义、执行技能工具 |
| 记忆中心 (MemoryHub) | 双向 | 检索相关记忆、追踪对话消息 |
| 安全沙箱 (SecuritySandbox) | 入 | 基于规则的执行权限守卫；规则管理与权限检查 |
| 事件发布接口 (IEventPublisher) | 出 | 发布认知阶段事件与步骤事件 |

### 9.2 框架契约接口

```typescript
/** Hub 基础接口 — 所有能力模块的统一抽象 */
interface IHub {
  getToolDefinition(toolName: string): ToolDefinition | undefined;
  hasTool(toolName: string): boolean;
}

/** LLM 客户端 */
interface IModelClient {
  chat(messages: Message[], tools?: ToolDefinition[]): Promise<ModelResponse>;
}

/** Token 计数器（不同模型的 tokenizer 不同，由外部实现） */
interface ITokenCounter {
  count(text: string): number;
  countTools(tools: ToolDefinition[]): number;
}

/** 记忆中心 */
interface MemoryHub extends IHub {
  searchMemory(query: string): Promise<{ text: string; tokenCount: number }>;
  trackMessage(role: string, content: string): Promise<void>;
}

/** 技能中心 */
interface SkillHub extends IHub {
  getSkillsDescription(): string[];
  getTools(skillName: string): ToolDefinition[];
  execute(skillName: string, toolName: string, args: Record<string, unknown>): Promise<string>;
}

/** 事件发布者（可选） */
interface IEventPublisher {
  publish(type: string, payload: unknown): void;
}

/** 安全沙箱 — 基于规则的执行权限守卫 */
interface SecuritySandbox {
  /** 检查工具操作的权限。可通过 AskHandler 向用户确认。 */
  checkPermission(request: PermissionRequest): Promise<PermissionDecision>;
  /** 将相对路径解析为沙箱工作目录下的绝对路径。 */
  resolvePath(filePath: string): string;
  /** 沙箱工作目录（用作 cmd 工具的默认 cwd）。 */
  readonly workingDirectory: string;
  /** 规则管理 */
  addRule(rule: PermissionRule): void;
  removeRules(action: ActionCategory, pattern?: string): number;
  getRules(): PermissionRule[];
}
```

### 9.2.1 AgentBrain 初始化选项

```typescript
interface AgentBrainOptions {
  model: IModelClient;
  tokenCounter: ITokenCounter;
  memory: MemoryHub;
  /** 天生工具提供者 */
  tools: IHub[];
  /** 技能中心 */
  skills: SkillHub;
  config: AgentConfig;
  /** 安全沙箱配置 */
  sandbox?: SandboxConfig;
  eventPublisher?: IEventPublisher;
}
```

### 9.3 配置项

| 配置 | 默认值 | 说明 |
|------|-------|------|
| systemPrompt | — | 系统提示词，角色定位与行为规范 |
| modelContextSize | — | 模型上下文窗口大小（token 数） |
| maxSteps | 15 | 小 ReAct 循环的最大步数 |
| heartbeatTimeoutMs | 60,000 | 心跳超时阈值 |
| maxConsecutiveFailures | 3 | 连续失败次数上限 |
| maxReplans | 2 | REFLECT 触发重规划的最大次数 |

#### SandboxConfig（沙箱配置）

| 配置 | 默认值 | 说明 |
|------|-------|------|
| workingDirectory | `os.tmpdir()/.bios-agent` | 所有工具的默认工作目录；相对路径基于此目录解析 |
| defaultPermission | `ASK` | 无匹配规则时的默认权限级别（`ALLOW`、`DENY` 或 `ASK`） |
| rules | `[]` | 构造时应用的初始权限规则列表 |

### 9.4 可插拔组件

| 组件 | 扩展方式 | 说明 |
|------|---------|------|
| 执行策略 | 策略模式 | 实现 `ExecutionStrategy` 接口定义新执行路径（如 `FastPathStrategy`、`FullCycleStrategy`） |
| 思维模式调度器 | 替换调度策略 | 可自定义每个认知阶段的思维模式权重配比 |
| 上下文组装策略 | 策略模式 | 可替换优先级排序与压缩算法 |
| 终止条件判定 | 条件链 | 可添加自定义终止条件 |
| 观察结果格式化 | 格式化器 | 可为不同工具类型定义专属的结果格式化方式 |
| 安全沙箱 | 构造配置 | 可自定义权限规则、工作目录和 ASK 处理器 |

---

## 10. 示例：完整认知过程

以"帮我分析上个月的服务器性能数据，找出性能瓶颈"为例：

### Phase 1: PERCEIVE

```
表层需求：分析上个月的服务器性能数据
深层意图：找到影响业务的性能瓶颈，以便针对性优化
约束：时间范围是上个月，针对的是现有服务器
模糊点：哪些服务器？性能数据从哪里获取？瓶颈的标准是什么？
成功标准：定位出 Top 3 性能瓶颈，并给出可操作的优化建议
```

### Phase 2: ASSESS

```
所需技能：
  - 服务器监控数据读取能力（Prometheus/Grafana 查询）
  - 性能分析方法论（CPU/内存/IO/网络的分析框架）
  - 数据可视化能力（生成图表）
  - 报告撰写能力

已有技能匹配：
  ✓ data-analysis（数据分析技能包）
  ✓ chart-generation（图表生成技能包）
  ✗ server-monitoring（服务器监控技能包）— 缺失

天生工具可用：
  ✓ 文件读写、网络请求

风险：缺少服务器监控技能包，可能需要在执行阶段动态获取
复杂度：moderate
可行：是（缺失的技能可通过天生技能获取）
```

### Phase 3: PLAN

```
策略：先获取缺失的监控技能，再收集数据、分析、生成报告

步骤：
  s1: 安装 server-monitoring 技能包（使用天生技能）
  s2: 查询上个月的服务器性能数据（CPU、内存、IO、网络）
  s3: 对数据进行统计分析，识别异常模式
  s4: 生成性能趋势图表
  s5: 撰写分析报告，给出 Top 3 瓶颈和优化建议
```

### Phase 4: EXECUTE（按计划步骤逐步执行）

```
═══ PlanStep s1: 安装 server-monitoring 技能包 ═══

  [Memory] 搜索 "安装监控技能 查询性能数据" → 无相关记忆
  [Prior Context] 无（首步）

  Step 1 [Thought]: 计划第一步是获取 server-monitoring 技能包
  Step 1 [Action]:  skill_list()  → 天生工具
  Step 1 [Observe]: 已安装技能：data-analysis, chart-generation

  Step 2 [Thought]: 缺少 server-monitoring，搜索并安装
  Step 2 [Action]:  skill_install("server-monitoring")  → 天生工具
  Step 2 [Observe]: 安装成功

  Step 3 [Thought]: 加载技能主模块使工具可用
  Step 3 [Action]:  skill_load_main("server-monitoring")  → 天生工具
  Step 3 [Observe]: 加载成功，新增工具：query_metrics, analyze_patterns, export_data
                    → skillTools 刷新

  Step 4 [Thought]: 技能包已就绪，步骤完成
  [Output]: server-monitoring 技能包已安装并加载，新增 3 个工具

═══ PlanStep s2: 查询上个月的服务器性能数据 ═══

  [Memory] 搜索 "查询服务器性能数据 CPU 内存" → 找到: "性能数据建议先确认时间范围"
  [Prior Context] s1 output: server-monitoring 技能包已安装并加载

  Step 5 [Thought]: 技能已就绪，使用 query_metrics 查询
  Step 5 [Action]:  query_metrics({ period: "last_month", metrics: ["cpu", "memory", "io", "network"] })
                    → 技能工具
  Step 5 [Observe]: 返回 30 天的性能数据...

  Step 6 [Thought]: 数据获取完成
  [Output]: 30 天性能数据已获取，包含 CPU/内存/IO/网络四项指标

═══ PlanStep s3: 对数据进行统计分析 ═══
... 依赖 s2 的输出作为输入 ...

═══ PlanStep s4: 生成风险趋势图表 ═══
... 依赖 s3 的输出 ...

═══ PlanStep s5: 撰写分析报告 ═══
... 依赖 s3, s4 的输出 ...

  [Output]: 完整报告文本 = ExecuteResult.finalAnswer
```

### Phase 5: REFLECT

```
达标：是
优点：成功获取了缺失技能并完成分析，Top 3 瓶颈定位准确
改进：可以增加历史对比分析，数据采样粒度可以更细
经验：性能分析任务应优先确认数据源和监控系统类型
需要重规划：否
```

---

## 附录 A：关键术语表

| 术语 | 定义 |
|------|------|
| 大 ReAct | 五阶段认知循环：PERCEIVE → ASSESS → PLAN → EXECUTE → REFLECT |
| 小 ReAct | EXECUTE 阶段内的 Thought → Action → Observation 迭代循环，每个 PlanStep 一个独立循环 |
| 认知阶段 | 大 ReAct 的五个阶段，模拟人类大脑的认知流程 |
| 认知产物 | 每个认知阶段输出的结构化结果（Perception、Assessment、Plan 等） |
| Hub | 能力模块的统一抽象接口（IHub），所有能力中心的基类 |
| InnateToolHub | 天生工具注册中心，管理系统内建工具的注册、查询和执行 |
| SkillHub | 技能中心，管理技能包的查询、加载和工具执行 |
| MemoryHub | 记忆中心，提供记忆检索和消息追踪 |
| HubTool | 能力桥接器，将其他 Hub 的操作包装为天生工具注册到 InnateToolHub |
| 技能包 (Skill) | 提供领域知识描述 + 一组工具的能力单元 |
| 天生工具 | 系统内建的基础工具，通过 InnateToolHub 管理，不依赖技能包即可使用 |
| PlanStepResult | 单个计划步骤的执行结果，包含步骤输出和 ReAct 日志 |
| 思维模式 | 四种核心思维方式：创造性、逻辑性、情感洞察、结构规划 |
| 思维模式调度器 | 根据当前认知阶段动态配比四种思维模式权重的组件 |
| ReAct 行为协议 | 注入 system prompt 的约束文本，指导模型遵循 Thought → Action → Observation 循环 |
| 重规划 | REFLECT 判定结果未达标时，回到 PLAN 重新制定计划 |
| 心跳 | 小 ReAct 每步完成后更新的存活标记，用于超时检测 |

## 附录 B：外部接口契约

框架不独立运行，它依赖以下抽象接口。具体由哪个系统实现，对框架透明：

| 接口 | 实现者 | 输入 | 输出 | 用途 |
|------|--------|------|------|------|
| IModelClient | 外部 | 消息列表 + 工具声明 | 模型回复 | 所有认知阶段的推理 |
| ITokenCounter | 外部 | 文本 / 工具列表 | token 数 | Token 预算管理 |
| SkillHub | 外部 | 技能名 + 工具名 + 参数 | 执行结果 | 技能管理与工具执行 |
| MemoryHub | 外部 | 查询文本 / 角色+内容 | 记忆片段 | 记忆检索与消息追踪 |
| IEventPublisher | 外部（可选） | 事件类型 + 载荷 | — | 可观测性 |
| IHub | 框架内部 | 工具名 | 工具定义 | Hub 统一抽象基类 |
