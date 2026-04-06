import { IHub } from '../types';

/**
 * CronHub — 定时任务管理接口
 * 
 * 提供定时任务的 CRUD 操作，用于调度和管理后台任务
 */
export interface CronHub extends IHub {

    /**
     * 列出所有定时任务
     * @param args 查询参数
     * @param args.status 可选，按状态筛选：active, paused, completed, failed
     * @param args.limit 返回数量限制，默认 20
     * @returns 任务列表
     * 
     * @example 返回格式:
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
     * 添加新定时任务
     * @param args 任务参数
     * @param args.name 任务名称（唯一标识）
     * @param args.cronExpression Cron 表达式（如："0 2 * * *" 表示每天凌晨2点）
     * @param args.command 要执行的命令
     * @returns 新创建的任务信息
     * 
     * @example 返回格式:
     * ```json
     * { "id": "job_001", "status": "ok", "name": "daily_backup", "nextRunTime": "2024-01-01T02:00:00Z" }
     * ```
     */
    cron_add(args: Record<string, unknown>): Promise<string>;

    /**
     * 删除定时任务
     * @param args 删除参数
     * @param args.id 要删除的任务 ID
     * @returns 删除结果
     * 
     * @example 返回格式:
     * ```json
     * { "status": "ok", "id": "job_001" }
     * ```
     */
    cron_delete(args: Record<string, unknown>): Promise<string>;

    /**
     * 暂停定时任务
     * @param args 暂停参数
     * @param args.id 要暂停的任务 ID
     * @returns 暂停结果
     * 
     * @example 返回格式:
     * ```json
     * { "status": "ok", "id": "job_001" }
     * ```
     */
    cron_pause(args: Record<string, unknown>): Promise<string>;

    /**
     * 恢复暂停的定时任务
     * @param args 恢复参数
     * @param args.id 要恢复的任务 ID
     * @returns 恢复结果
     * 
     * @example 返回格式:
     * ```json
     * { "status": "ok", "id": "job_001" }
     * ```
     */
    cron_resume(args: Record<string, unknown>): Promise<string>;

    /**
     * 立即执行定时任务
     * @param args 执行参数
     * @param args.id 要执行的任务 ID
     * @returns 执行结果
     * 
     * @example 返回格式:
     * ```json
     * { "status": "ok", "id": "job_001" }
     * ```
     */
    cron_run_now(args: Record<string, unknown>): Promise<string>;

}
