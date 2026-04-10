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
import { AskUserTool } from './ask-user-tool';
import {
  FSReadTool,
  FSWriteTool,
  FSEditTool,
  FSDeleteTool,
  FSListTool,
  FSMkdirTool,
  FSExistsTool,
  FSStatTool,
  FSSearchTool,
  FSGrepTool,
} from './file-system-tool';
import {
  CmdExecTool,
  CmdRunTool,
  CmdKillTool,
  CmdBgTool,
  CmdListTool,
} from './command-tool';
import {
  HttpGetTool,
  HttpPostTool,
  HttpFetchHtmlTool,
  WebSearchTool,
  WebScrapeTool,
} from './web-tool';
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
  
  hub.register(new FSReadTool());
  hub.register(new FSWriteTool());
  hub.register(new FSEditTool());
  hub.register(new FSDeleteTool());
  hub.register(new FSListTool());
  hub.register(new FSMkdirTool());
  hub.register(new FSExistsTool());
  hub.register(new FSStatTool());
  hub.register(new FSSearchTool());
  hub.register(new FSGrepTool());
  
  hub.register(new CmdExecTool());
  hub.register(new CmdRunTool());
  hub.register(new CmdKillTool());
  hub.register(new CmdBgTool());
  hub.register(new CmdListTool());
  
  hub.register(new HttpGetTool());
  hub.register(new HttpPostTool());
  hub.register(new HttpFetchHtmlTool());
  hub.register(new WebSearchTool());
  hub.register(new WebScrapeTool());
  
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
