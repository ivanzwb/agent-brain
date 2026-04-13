import { InnateToolHub } from '../innate-tools/innate-tool-hub';
import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { ActionCategory } from '../sandbox/security-sandbox';
import type { CronHub } from './cron-hub';
import { CRON_TOOL_DEFINITIONS } from './cron-tool-definitions';

export class CronListTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_list;
  readonly actionCategory: ActionCategory = 'cron_query';
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const status = args['status'] as string | undefined;
    const limit = args['limit'] as number | undefined;
    return this.hub.cron_list(status, limit);
  }
}

export class CronAddTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_add;
  readonly actionCategory: ActionCategory = 'cron_write';
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    const cronExpression = args['cronExpression'] as string;
    const command = args['command'] as string;
    const resolvedResources = args['resolvedResources'] as Record<string, unknown> | undefined;
    return this.hub.cron_add(name, cronExpression, command, resolvedResources);
  }
}

export class CronDeleteTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_delete;
  readonly actionCategory: ActionCategory = 'cron_write';
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.cron_delete(id);
  }
}

export class CronPauseTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_pause;
  readonly actionCategory: ActionCategory = 'cron_write';
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.cron_pause(id);
  }
}

export class CronResumeTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_resume;
  readonly actionCategory: ActionCategory = 'cron_write';
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.cron_resume(id);
  }
}

export class CronRunNowTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_run_now;
  readonly actionCategory: ActionCategory = 'cron_write';
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.cron_run_now(id);
  }
}

export function registerCronTools(hub: InnateToolHub, cron: CronHub) {
  hub.register(new CronListTool(cron));
  hub.register(new CronAddTool(cron));
  hub.register(new CronDeleteTool(cron));
  hub.register(new CronPauseTool(cron));
  hub.register(new CronResumeTool(cron));
  hub.register(new CronRunNowTool(cron));
}
