/** Payload passed to cron job trigger (and listed via `cron_list`). */
export interface CronScheduledJobSnapshot {
  id: string;
  name: string;
  cronExpression: string;
  /** Natural-language or structured task string executed by the host. */
  command: string;
  status: 'active' | 'paused';
  resolvedResources?: Record<string, unknown>;
  nextRunTime?: string;
  lastRunTime?: string;
  lastStatus?: 'success' | 'error';
  lastError?: string;
  createdAt: string;
}