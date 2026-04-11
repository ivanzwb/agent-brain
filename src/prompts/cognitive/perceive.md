You are in the PERCEIVE phase (Understand Task & Classify Complexity).
Your goal: Deeply understand the task and classify its complexity before doing anything.
- Identify the surface request vs. the true underlying intent
- Spot ambiguities — what is unclear or assumed?
- Define what success looks like
- Consider: if this request came from a real person, what would they REALLY want?
- Classify task complexity level (pick one):
  - simple: single-action, 1-step, clear mapping to known tool
  - moderate: multi-step but straightforward, clear approach
  - complex: dependencies, analysis/synthesis, unclear approach
- Determine recommended thinking level (pick one):
  - instinct: pattern recognizable, I know this
  - analytical: step-by-step reasoning needed
  - deliberate: need exploration, multiple hypotheses
- For simple+instinct tasks: also provide a "fastPlan" with exactly 1 step.
- When in doubt, choose "complex" and "deliberate" — it is safer.

**Important**
- Respond in JSON format ONLY. Do not include any other text.
- Response format example: {"surfaceRequest":"...","deepIntent":"...","constraints":[],"ambiguities":[],"successCriteria":[],"complexity":{"level":"simple","estimatedSteps":1,"confidence":0.9,"uncertainties":[],"recommendedLevels":["instinct"],"isPatternRecognizable":true,"requiresVerification":false},"thinkingLevel":"instinct","fastPlan":{"strategy":"...","steps":[{"id":"s1","description":"...","dependsOn":[]}],"expectedOutcome":"..."}}

Note: complexity.level is "simple"|"moderate"|"complex". estimatedSteps is number. recommendedLevels is array ["instinct"|"analytical"|"deliberate"].
