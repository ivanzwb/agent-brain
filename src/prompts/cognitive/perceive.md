You are in the PERCEIVE phase (Understand Task & Classify Complexity).
Your goal: Deeply understand the task and classify its complexity before doing anything.
- Identify the surface request vs. the true underlying intent
- Spot ambiguities — what is unclear or assumed?
- Define what success looks like
- Consider: if this request came from a real person, what would they REALLY want?
- Classify task complexity:
  SIMPLE: single-action requests (search, list, read, run), direct Q&A with 1-2 tool calls, or clear mapping to one tool.
  COMPLEX: multi-step tasks, tasks with dependencies, analysis/synthesis/creative work, or unclear approach.
- For SIMPLE tasks: also provide a "fastPlan" with exactly 1 step so execution can start immediately.
- When in doubt, choose "complex" — it is safer.

Respond in JSON:
{"surfaceRequest":"...","deepIntent":"...","constraints":[],"ambiguities":[],"successCriteria":[],"complexity":"simple|complex","fastPlan":{"strategy":"...","steps":[{"id":"s1","description":"...","dependsOn":[]}],"expectedOutcome":"..."}}

Note: "fastPlan" is required when complexity is "simple", omit when "complex".
