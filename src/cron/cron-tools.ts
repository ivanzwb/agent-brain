import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { CronHub } from './cron-hub';
import { CRON_TOOL_DEFINITIONS } from './cron-tool-definitions';

export class CronListTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_list;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.cron_list(args);
  }
}

export class CronAddTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_add;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.cron_add(args);
  }
}

export class CronDeleteTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_delete;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.cron_delete(args);
  }
}

export class CronPauseTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_pause;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.cron_pause(args);
  }
}

export class CronResumeTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_resume;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.cron_resume(args);
  }
}

export class CronRunNowTool implements InnateTool {
  readonly definition: ToolDefinition = CRON_TOOL_DEFINITIONS.cron_run_now;
  constructor(private hub: CronHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.cron_run_now(args);
  }
}
