> **Long-term memory policy (business logic)**: **`memory_*`** is the **persistent long-term** store (**not** this session’s raw chat). Tool definitions cover **payloads and responses**; here we define **routing and sequencing** vs **`conversation_*`** / **`knowledge_*`**. Session vs long-term is also summarized in the **conversation** policy block.

- **Read — semantic**: When you need **meaning-based** recall (preferences, saved facts), use **memory_search** with a focused natural-language ask; if results are too thin, widen retrieval **as allowed by that tool’s schema**—avoid empty or vague asks.
- **Read — inventory**: Use **memory_history** to **browse what was stored recently**. It is **not** a substitute for “what do we know about X?”—that is **memory_search** territory.
- **Write**: Use **memory_save** only when the user or task clearly wants **durable recall later**. Do not dump whole chats here when **conversation_track** is the right channel.
- **Delete**: Remove long-term records only after a **prior** list/search (or the user) made the target unambiguous—never guess identifiers.
- **Style**: Prefer **memory_search** before **ask_user** for long-term facts. If **memory_*** tools are **absent** from the tool list, memory is **unwired**—do not imply it exists.
