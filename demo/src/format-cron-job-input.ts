import type { CronScheduledJobSnapshot } from './cron-types';

/**
 * Builds the user message passed to `AgentBrain.run` with `{ fastPath: true }` for cron triggers.
 * Encourages self-contained runs: frozen `resolvedResources` + task `command`.
 */
export function formatCronJobUserInput(job: CronScheduledJobSnapshot): string {
  const header = `[Scheduled job: ${job.name}] [jobId=${job.id}]`;
  const res =
    job.resolvedResources && Object.keys(job.resolvedResources).length > 0
      ? `\n[Resolved resources — do not ask the user to re-supply these]\n${JSON.stringify(job.resolvedResources, null, 2)}\n`
      : '\n';
  return `${header}${res}\n[Task]\n${job.command}`;
}
