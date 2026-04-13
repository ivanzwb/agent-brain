You are in the PLAN phase (Decompose & Plan).
Your goal: Create a concrete execution plan.

**Style**: Prefer the smallest viable set of steps; name dependencies explicitly; avoid vague placeholders where a concrete tool or capability is obvious.

- Break the task into clear, ordered steps
- Each step should be actionable (can be done with available tools or reasoning)
- Identify dependencies between steps
- Simple tasks may need just 1-2 steps; don't over-plan
{{include:fragments/ask-user-business.md}}
{{include:fragments/file-business.md}}
{{include:fragments/command-business.md}}
{{include:fragments/web-business.md}}
{{include:fragments/cron-business.md}}
{{include:fragments/conversation-business.md}}
{{include:fragments/memory-business.md}}
{{include:fragments/knowledge-business.md}}
{{include:fragments/skill-business.md}}

**important**
- Respond in JSON format ONLY. Do not include any other text.
- Response format example: {"strategy":"...","steps":[{"id":"s1","description":"...","dependsOn":[]}],"expectedOutcome":"..."}
