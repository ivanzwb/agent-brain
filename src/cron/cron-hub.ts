import type { IHub } from '../types';

export interface CronHub extends IHub {

  /**
   * List all scheduled tasks
   * @param status Optional, filter by status: active, paused, completed, failed
   * @param limit Return count limit, default 20
   * @returns List of tasks
   *
   * @example Return format:
   * ```json
   * {
   *   "jobs": [
   *     { "id": "job_001", "name": "daily_backup", "cronExpression": "0 2 * * *", "status": "active", "nextRunTime": "2024-01-01T02:00:00Z" }
   *   ],
   *   "count": 1
   * }
   * ```
   */
  cron_list(status?: string, limit?: number): Promise<string>;

  /**
   * Add a new scheduled task. Implementations should validate `cronExpression` and
   * schedule the next run. Optional **resolvedResources**: snapshot of inputs clarified
   * before the job was created (paths, endpoints, etc.) so headless runs stay self-contained.
    * @param name Task name (unique identifier)
    * @param cronExpression Cron expression (e.g., "0 2 * * *" means 2 AM daily)
    * @param command Command to execute
    * @returns Newly created task info
    *
    * @example Return format:
    * ```json
    * { "id": "job_001", "status": "ok", "name": "daily_backup", "nextRunTime": "2024-01-01T02:00:00Z" }
    * ```
    */
  cron_add(
    name: string,
    cronExpression: string,
    command: string,
    resolvedResources?: Record<string, unknown>,
  ): Promise<string>;

  /**
   * Delete a scheduled task
   * @param id Task ID to delete
   * @returns Delete result
   *
   * @example Return format:
   * ```json
   * { "status": "ok", "id": "job_001" }
   * ```
   */
  cron_delete(id: string): Promise<string>;

  /**
   * Pause a scheduled task
   * @param id Task ID to pause
   * @returns Pause result
   *
   * @example Return format:
   * ```json
   * { "status": "ok", "id": "job_001" }
   * ```
   */
  cron_pause(id: string): Promise<string>;

  /**
   * Resume a paused scheduled task
   * @param id Task ID to resume
   * @returns Resume result
   *
   * @example Return format:
   * ```json
   * { "status": "ok", "id": "job_001" }
   * ```
   */
  cron_resume(id: string): Promise<string>;

  /**
   * Execute a scheduled task immediately (same handler as a timed trigger).
    * @param id Task ID to execute
    * @returns Execute result
    *
    * @example Return format:
    * ```json
    * { "status": "ok", "id": "job_001" }
    * ```
    */
  cron_run_now(id: string): Promise<string>;
}
