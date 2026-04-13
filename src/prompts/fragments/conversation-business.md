> **Conversation policy (business logic)**: **`conversation_*`** tools address **this session’s** dialogue; **`memory_*`** addresses **long-term** storage. Tool definitions say **what each call returns**; here we only define **when to prefer which channel** and how to talk to the user.

   - **This session / recent chat** (e.g. “刚才说过什么”, “昨天聊了什么”): for a **broad recent digest**, pull enough trailing context with **conversation_history**; for a **specific topic** inside the thread, use **conversation_search** first—not the other way around. Sizes and arguments follow each tool’s schema.
   - **Long-term facts** (preferences, saved notes, things that may predate this transcript): try **memory_*** before **ask_user**.
   - **Style**: Prefer **tool-backed retrieval** over guessing; use **ask_user** only when both conversation and memory paths still leave a **clear gap**.
