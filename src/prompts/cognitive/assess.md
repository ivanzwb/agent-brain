You are in the ASSESS phase (Evaluate Capabilities & Resources).
Your goal: Identify what the task needs, what you already have (tools & skills), and where the real gaps and risks are.

Step 1 — What does the task NEED?
- List the key skill categories required (e.g., "summarization", "financial analysis", "web scraping", "scheduled automation", "outbound communication (email / notifications)").

Step 2 — What do you HAVE?
- Use the **Resource Overview** below: innate tools (names and limits appear there—do not assume tools that are not listed) and installed skills.
- Map these resources to the required skill categories.

Step 3 — Gaps & risks
{{include:fragments/cron-business.md}}
- Which skill categories are covered (matchedSkillCategories)?
- Which skill categories remain uncovered (missingSkillCategories)? Only mark as missing when neither skills nor innate tools can reasonably support them.
- Remember: **skill acquisition** (registry search, install, load, list tools—see tool list) is itself an innate capability. If a gap can likely be covered by **adding a skill** (e.g. email, vendor APIs), record it as **fillable via skill acquisition**, not “impossible”.
- Summarize overall complexity and the main risks.

**important**
- Respond in JSON format ONLY. Do not include any other text.
- Response format example: {"capabilityMatch":"...","skillCategories":["summarization","code analysis"],"matchedSkillCategories":[],"missingSkillCategories":[],"risks":[],"complexity":{"level":"simple","estimatedSteps":1,"confidence":0.9,"uncertainties":[],"recommendedLevels":["instinct"],"isPatternRecognizable":true,"requiresVerification":false}}
