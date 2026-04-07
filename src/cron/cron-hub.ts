import { IHub } from '../types';

/**
 * CronHub — Scheduled task management interface
 *
 * Provides CRUD operations for scheduled tasks, used for scheduling and managing background tasks
 */
export interface CronHub extends IHub {

    /**
     * List all scheduled tasks
     * @param args Query parameters
     * @param args.status Optional, filter by status: active, paused, completed, failed
     * @param args.limit Return count limit, default 20
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
    cron_list(args: Record<string, unknown>): Promise<string>;

    /**
     * Add a new scheduled task
     * @param args Task parameters
     * @param args.name Task name (unique identifier)
     * @param args.cronExpression Cron expression (e.g., "0 2 * * *" means 2 AM daily)
     * @param args.command Command to execute
     * @returns Newly created task info
     *
     * @example Return format:
     * ```json
     * { "id": "job_001", "status": "ok", "name": "daily_backup", "nextRunTime": "2024-01-01T02:00:00Z" }
     * ```
     */
    cron_add(args: Record<string, unknown>): Promise<string>;

    /**
     * Delete a scheduled task
     * @param args Delete parameters
     * @param args.id Task ID to delete
     * @returns Delete result
     *
     * @example Return format:
     * ```json
     * { "status": "ok", "id": "job_001" }
     * ```
     */
    cron_delete(args: Record<string, unknown>): Promise<string>;

    /**
     * Pause a scheduled task
     * @param args Pause parameters
     * @param args.id Task ID to pause
     * @returns Pause result
     *
     * @example Return format:
     * ```json
     * { "status": "ok", "id": "job_001" }
     * ```
     */
    cron_pause(args: Record<string, unknown>): Promise<string>;

    /**
     * Resume a paused scheduled task
     * @param args Resume parameters
     * @param args.id Task ID to resume
     * @returns Resume result
     *
     * @example Return format:
     * ```json
     * { "status": "ok", "id": "job_001" }
     * ```
     */
    cron_resume(args: Record<string, unknown>): Promise<string>;

    /**
     * Execute a scheduled task immediately
     * @param args Execute parameters
     * @param args.id Task ID to execute
     * @returns Execute result
     *
     * @example Return format:
     * ```json
     * { "status": "ok", "id": "job_001" }
     * ```
     */
    cron_run_now(args: Record<string, unknown>): Promise<string>;

}
