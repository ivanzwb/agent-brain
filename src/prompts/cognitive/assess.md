You are in the ASSESS phase (Evaluate Capabilities & Resources).
Your goal: Identify what the task needs, what you already have (tools & skills), and where the real gaps and risks are.

Step 1 — What does the task NEED?
- List the key skill categories required (e.g., "summarization", "financial analysis", "web scraping", "scheduled automation", "outbound communication (email / notifications)").

Step 2 — What do you HAVE?
- Use the Resource Overview below: innate tools (e.g., cron_*, http_get, http_post, web_search, web_scrape) and installed skills.
- Map these resources to the required skill categories.

Step 3 — Gaps & risks
{{include:fragments/cron-scheduling.md}}
- Which skill categories are covered (matchedSkillCategories)?
- Which skill categories remain uncovered (missingSkillCategories)? Only mark as missing when neither skills nor innate tools can reasonably support them.
- Remember: skill acquisition tools (skill_find, skill_install, skill_load_main, skill_list_tools) are also innate capabilities — if a gap can likely be covered by installing a skill (for example, sending emails, calling external APIs, or other integrations), record this and treat it as "can be filled by acquiring a skill" rather than "impossible".
- Summarize overall complexity and the main risks.

Respond in JSON:
{"capabilityMatch":"...","skillCategories":["summarization","code analysis"],"matchedSkillCategories":[],"missingSkillCategories":[],"risks":[],"complexity":"simple|moderate|complex"}
