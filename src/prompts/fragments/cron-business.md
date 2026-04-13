{{include:fragments/cron-scheduling.md}}

> **Cron jobs (business)**: **`cron_*`** manages **scheduled work** in the host. **IDs, filters, and payloads** are in each tool; here we define **safe multi-turn operation**.

- **Discover before mutate**: Use **cron_list** (and filters when helpful) to obtain **job ids** before **pause**, **resume**, **delete**, or **run_now**—do not guess identifiers.
- **Irreversible deletes**: Treat **cron_delete** as **removing** that scheduled record from this runtime; confirm the user wants removal when ambiguity exists.
- **One tool per turn**: Adjusting schedules may take **several** ReAct steps (list → act → verify); that is expected.
