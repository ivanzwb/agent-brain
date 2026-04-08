import { CronHub } from '../../src/cron/cron-hub';
import { CRON_TOOL_DEFINITIONS } from '../../src/cron/cron-tool-definitions';

interface JobEntry {
  id: string;
  name: string;
  cronExpression: string;
  command: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  nextRunTime?: string;
  lastRunTime?: string;
  lastStatus?: 'success' | 'error';
  createdAt: string;
  interval?: NodeJS.Timeout;
}

export class CronHubAdapter implements CronHub {
  private jobs = new Map<string, JobEntry>();
  private toolMap = new Map<string, any>(
    Object.entries(CRON_TOOL_DEFINITIONS).map(([k, v]) => [v.name, v])
  );

  getToolDefinition(name: string): any {
    return this.toolMap.get(name);
  }

  hasTool(name: string): boolean {
    return this.toolMap.has(name);
  }

  async cron_list(status?: string, limit?: number): Promise<string> {
    const _limit = limit || 20;

    let result = Array.from(this.jobs.values());
    if (status) result = result.filter(j => j.status === status);

    return JSON.stringify({
      status: 'ok',
      count: result.length,
      jobs: result.slice(0, _limit).map(j => ({
        id: j.id,
        name: j.name,
        cronExpression: j.cronExpression,
        command: j.command,
        status: j.status,
        nextRunTime: j.nextRunTime,
        lastRunTime: j.lastRunTime,
        lastStatus: j.lastStatus,
      })),
    });
  }

  async cron_add(name: string, cronExpression: string, command: string): Promise<string> {
    const id = 'job_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);

    const job: JobEntry = {
      id,
      name,
      cronExpression,
      command,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const intervalMs = this.parseCron(cronExpression);
    job.interval = setInterval(async () => {
      const { exec } = await import('child_process');
      exec(command, (err) => {
        const j = this.jobs.get(id);
        if (j) {
          j.lastRunTime = new Date().toISOString();
          j.lastStatus = err ? 'error' : 'success';
        }
      });
    }, intervalMs);

    job.nextRunTime = new Date(Date.now() + intervalMs).toISOString();
    this.jobs.set(id, job);

    return JSON.stringify({
      status: 'ok',
      id,
      name,
      cronExpression,
      nextRunTime: job.nextRunTime,
    });
  }

  async cron_delete(id: string): Promise<string> {
    const job = this.jobs.get(id);

    if (!job) {
      return JSON.stringify({ status: 'error', message: `Job ${id} not found` });
    }

    if (job.interval) clearInterval(job.interval);
    this.jobs.delete(id);

    return JSON.stringify({ status: 'ok', id });
  }

  async cron_pause(id: string): Promise<string> {
    const job = this.jobs.get(id);

    if (!job) {
      return JSON.stringify({ status: 'error', message: `Job ${id} not found` });
    }

    if (job.interval) {
      clearInterval(job.interval);
      job.interval = undefined;
    }
    job.status = 'paused';

    return JSON.stringify({ status: 'ok', id });
  }

  async cron_resume(id: string): Promise<string> {
    const job = this.jobs.get(id);

    if (!job) {
      return JSON.stringify({ status: 'error', message: `Job ${id} not found` });
    }

    if (!job.interval) {
      const intervalMs = this.parseCron(job.cronExpression);
      job.interval = setInterval(async () => {
        const { exec } = await import('child_process');
        exec(job.command, (err) => {
          job.lastRunTime = new Date().toISOString();
          job.lastStatus = err ? 'error' : 'success';
        });
      }, intervalMs);
      job.nextRunTime = new Date(Date.now() + intervalMs).toISOString();
    }
    job.status = 'active';

    return JSON.stringify({ status: 'ok', id });
  }

  async cron_run_now(id: string): Promise<string> {
    const job = this.jobs.get(id);

    if (!job) {
      return JSON.stringify({ status: 'error', message: `Job ${id} not found` });
    }

    const { exec } = await import('child_process');
    exec(job.command, (err) => {
      job.lastRunTime = new Date().toISOString();
      job.lastStatus = err ? 'error' : 'success';
    });

    return JSON.stringify({ status: 'ok', id });
  }

  private parseCron(cron: string): number {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return 60000;
    const [min] = parts;
    if (min === '*') return 60000;
    return 60000;
  }

  async close(): Promise<void> {
    for (const job of this.jobs.values()) {
      if (job.interval) clearInterval(job.interval);
    }
    this.jobs.clear();
  }
}
