export type CronJobStatus = 'active' | 'paused' | 'completed' | 'failed';

/** Payload passed to `onJobTrigger` (and listed via `cron_list`). */
export interface CronScheduledJobSnapshot {
  id: string;
  name: string;
  cronExpression: string;
  /** Natural-language or structured task string executed by the host (e.g. AgentBrain.run). */
  command: string;
  status: CronJobStatus;
  resolvedResources?: Record<string, unknown>;
  nextRunTime?: string;
  lastRunTime?: string;
  lastStatus?: 'success' | 'error';
  lastError?: string;
  createdAt: string;
}

export type CronJobTriggerHandler = (job: CronScheduledJobSnapshot) => Promise<void>;
