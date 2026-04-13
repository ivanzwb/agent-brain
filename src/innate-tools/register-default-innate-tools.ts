import type { MemoryHub } from '../memory/memory-hub';
import type { KnowledgeHub } from '../knowledge/knowledge-hub';
import type { CronHub } from '../cron/cron-hub';
import type { SkillHub } from '../skill/skill-hub';
import {
  registerMemoryTools,
} from '../memory/memory-tools';
import {
  registerKnowledgeTools,
} from '../knowledge/knowledge-tools';
import {
  registerSkillTools,
} from '../skill/skill-tools';
import { registerFileSystemTools } from './file-system-tool';
import { registerCommandTools } from './command-tool';
import { registerWebTools } from './web-tool';
import { AskUserTool } from './ask-user-tool';
import {
  registerCronTools,
} from '../cron/cron-tools';
import { InnateToolHub } from './innate-tool-hub';

export interface RegisterDefaultInnateToolsContext {
  memory: MemoryHub;
  skills: SkillHub;
  knowledge?: KnowledgeHub;
  cron?: CronHub;
}

/**
 * Registers the stock innate tool set on a hub. Extend by registering additional tools
 * after this call, or fork this function for a custom brain build.
 */
export function registerDefaultInnateTools(
  hub: InnateToolHub,
  ctx: RegisterDefaultInnateToolsContext,
): void {
  
  registerFileSystemTools(hub);
  registerCommandTools(hub);
  registerWebTools(hub);
  
  hub.register(new AskUserTool(hub));

  registerMemoryTools(hub, ctx.memory);
  registerSkillTools(hub, ctx.skills);

  if (ctx.knowledge) {
    registerKnowledgeTools(hub, ctx.knowledge);
  }

  if (ctx.cron) {
    registerCronTools(hub, ctx.cron);
  }
}
