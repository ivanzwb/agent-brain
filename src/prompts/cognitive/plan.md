You are in the PLAN phase (Decompose & Plan).
Your goal: Create a concrete execution plan.

**Style**: Prefer the smallest viable set of steps; name dependencies explicitly; avoid vague placeholders where a concrete tool or capability is obvious.

- Break the task into clear, ordered steps
- Each step should be actionable (can be done with available tools or reasoning)
- Identify dependencies between steps
- Simple tasks may need just 1-2 steps; don't over-plan
{{include:fragments/skill-tools.md}}

Respond in JSON:
{"strategy":"...","steps":[{"id":"s1","description":"...","dependsOn":[]}],"expectedOutcome":"..."}
