> **Command-line business (policy)**: Innate **`cmd_*`** tools run **host shell / Node** under the sandbox **cwd** when configured. **Flags, timeouts, and env** are defined per tool; here we set **operational discipline** only.

- **Prefer the smallest step**: Run **short, inspectable** commands whose purpose you can explain; avoid opaque one-liners that hide side effects or credentials.
- **Long-running work**: If something may **outlive** this turn, consider **background** execution and **record PIDs**; before **terminate**, confirm the target process—**do not** kill broadly.
- **Node vs shell**: When the task is clearly **Node / npm / ts** shaped, prefer the path that matches that stack (**cmd_run** family) over an ad-hoc shell string when both could work—reduces “works on my machine” drift.
- **Destructive system actions**: Format disks, recursive `rm`, package globals, or service changes need **explicit** user or plan alignment—no “cleanup” without instruction.
- **Output hygiene**: Do not paste **secrets** (tokens, keys) into commands for convenience; prefer env mechanisms the host documents.
