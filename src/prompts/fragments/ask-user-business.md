> **ask_user (policy)**: **`ask_user`** **blocks** until the user answers. **Wording and required fields** are in the tool definition; here we define **when interruption is justified** and how to ask well.

- **Last resort for facts**: Prefer **conversation_***, **memory_***, **knowledge_***, **fs_***, **web_***, or **skills** when the information could be **retrieved**; use **ask_user** when there is a **genuine** missing preference, credential, or decision only the user can make.
- **One focused turn**: Ask **one** clear question (or one tightly related set); avoid **questionnaires** in a single call—follow up in a later turn if needed.
- **No sandbox gaming**: Do not use **ask_user** to **circumvent** permission or policy outcomes; **security** prompts may also ask the user—**keep purposes separate** and don’t double-prompt without reason.
- **Actionable wording**: State **what** you need and **how** it will be used so the user can answer in one pass.
