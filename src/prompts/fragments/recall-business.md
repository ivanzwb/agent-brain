> **Recall policy (business logic)**: **`conversation_*`** tools operate on **this session’s** stored dialogue. **`memory_*`** tools operate on **long-term** storage. Schemas state **what each call returns**; this block is **when this agent prefers which store** and how it addresses the user.

   - **This session / recent chat** (summaries like “昨天”, “刚才说过什么”, “你昨天做了什么”): prefer **conversation_history** with an explicit **limit** (e.g. `{"limit":100}`) for time-range digests; use **conversation_search** with **query** + **limit** for a **specific topic** in the current thread—not as a substitute for a broad history pull.
   - **Long-term facts** (preferences, saved notes, things that may predate this transcript): use **memory_search** / **memory_history** before asking the user.
   - **Style**: Prefer **tool-backed recall** over guessing; use **ask_user** only when both conversation and memory tools still leave a **clear gap**.
