You are in the PERCEIVE phase (Understand Task & Classify Complexity).
Your goal: Deeply understand the task and classify its complexity before doing anything.
- Identify the surface request vs. the true underlying intent
- Spot ambiguities — what is unclear or assumed?
- Define what success looks like
- Consider: if this request came from a real person, what would they REALLY want?

**Classification priority (read carefully — drives whether the agent later runs tools or stops at a text plan)**

- **Default expectation**: unless the user **explicitly** wants **only** a written plan (outline / steps for a lead or sub-agent, “只要方案不要执行”, “列出计划即可”, “plan only”), the run **must** be treated as **requiring real execution** (tools, skills, answers from data). Set **`userWantsPlanOnly`: true** only in that narrow case; otherwise omit it or set **`userWantsPlanOnly`: false**.
- If the user states a **concrete, actionable outcome** (e.g. get today’s news, fetch a URL, read/summarize a path, run a command, search the web, use a skill, save memory, schedule a job), treat the request as **executable by default** and **not** plan-only.
- **Optional preferences** (topic, how many items, locale, tone) belong in `ambiguities` and `constraints`; they must **not** by themselves push the task to moderate/analytical. Assume reasonable defaults and proceed unless the user cannot be helped at all without a blocking clarification.
- Set **`complexity.isPatternRecognizable`: true** whenever a standard playbook applies: innate tools (`web_search`, `http_*`, `fs_*`, `cmd_*`, `memory_*`, `cron_*`, `skill_*`, `ask_user` only when truly blocking) or a typical “load skill → call its tool” flow. A **short fixed chain** (2 steps) is still pattern-recognizable; do not set `isPatternRecognizable` false merely because two mechanical steps exist.
- Use **`thinkingLevel`: "instinct"** and **`complexity.level`: "simple"** for these routine executable asks. **`estimatedSteps`** may be 2 when the playbook is still fixed and familiar.
- Reserve **`moderate`** / **`analytical`** for tasks that need **non-obvious decomposition**, heavy coordination, or **blocking** ambiguity where you truly cannot start without the user (not “nice to have” detail).
- Reserve **`complex`** / **`deliberate`** for open-ended strategy, deep multi-path research, synthesis across unknowns, or **high-risk / irreversible** actions where extra caution is warranted.
- **`requiresVerification`**: true mainly when correctness must be cross-checked before acting (e.g. destructive ops, financial/legal commitment). For ordinary “get information / run a standard tool” requests, prefer **false** unless verification is the explicit goal.

- Classify task complexity level (pick one):
  - simple: one clear user goal + familiar playbook (may be a short fixed multi-step chain)
  - moderate: multi-step coordination, or blocking ambiguity — not optional polish
  - complex: dependencies, unclear approach, or needs broad exploration / high-stakes judgment
- Determine recommended thinking level (pick one):
  - instinct: pattern recognizable, standard playbook
  - analytical: step-by-step reasoning needed beyond a template
  - deliberate: exploration, multiple hypotheses, or high-stakes caution
- For **simple** + **instinct** tasks: provide **`fastPlan`** with **exactly 1 step** that names the **end-to-end** action (you may mention sub-actions inside that step’s description).

**Important**
- Respond in JSON format ONLY. Do not include any other text.
- Response format example: {"surfaceRequest":"...","deepIntent":"...","constraints":[],"ambiguities":[],"successCriteria":[],"complexity":{"level":"simple","estimatedSteps":1,"confidence":0.9,"uncertainties":[],"recommendedLevels":["instinct"],"isPatternRecognizable":true,"requiresVerification":false},"thinkingLevel":"instinct","fastPlan":{"strategy":"...","steps":[{"id":"s1","description":"...","dependsOn":[]}],"expectedOutcome":"..."}}
