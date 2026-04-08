import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { CronHub } from './cron-hub';
import { CRON_TOOL_DEFINITIONS } from './cron-tool-definitions';

export class CronListTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_list;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const status = args['status'] as string | undefined;
    const limit = args['limit'] as number | undefined;
    return this.hub.cron_list(status, limit);
  }
}

export class CronAddTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_add;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    const cronExpression = args['cronExpression'] as string;
    const command = args['command'] as string;
    return this.hub.cron_add(name, cronExpression, command);
  }
}

export class CronDeleteTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_delete;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.cron_delete(id);
  }
}

export class CronPauseTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_pause;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.cron_pause(id);
  }
}

export class CronResumeTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_resume;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.cron_resume(id);
  }
}

export class CronRunNowTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_run_now;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.cron_run_now(id);
  }
}
