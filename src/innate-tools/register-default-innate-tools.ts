import type { MemoryHub } from '../memory/memory-hub';
import type { KnowledgeHub } from '../knowledge/knowledge-hub';
import type { CronHub } from '../cron/cron-hub';
import type { SkillHub } from '../skill/skill-hub';
import {
  MemorySearchTool,
  MemorySaveTool,
  MemoryHistoryTool,
  MemoryDeleteTool,
  ConversationTrackTool,
  ConversationSearchTool,
  ConversationHistoryTool,
} from '../memory/memory-tools';
import {
  KnowledgeListTool,
  KnowledgeAddTool,
  KnowledgeDeleteTool,
  KnowledgeSearchTool,
} from '../knowledge/knowledge-tools';
import {
  SkillFindTool,
  SkillListTool,
  SkillInstallTool,
  SkillLoadMainTool,
  SkillLoadReferenceTool,
  SkillListToolsTool,
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
  CronListTool,
  CronAddTool,
  CronDeleteTool,
  CronPauseTool,
  CronResumeTool,
  CronRunNowTool,
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
  hub.register(new ConversationTrackTool(ctx.memory));
  hub.register(new ConversationSearchTool(ctx.memory));
  hub.register(new ConversationHistoryTool(ctx.memory));
  hub.register(new MemorySearchTool(ctx.memory));
  hub.register(new MemorySaveTool(ctx.memory));
  hub.register(new MemoryHistoryTool(ctx.memory));
  hub.register(new MemoryDeleteTool(ctx.memory));

  if (ctx.knowledge) {
    hub.register(new KnowledgeListTool(ctx.knowledge));
    hub.register(new KnowledgeAddTool(ctx.knowledge));
    hub.register(new KnowledgeDeleteTool(ctx.knowledge));
    hub.register(new KnowledgeSearchTool(ctx.knowledge));
  }

  hub.register(new SkillFindTool(ctx.skills));
  hub.register(new SkillListTool(ctx.skills));
  hub.register(new SkillInstallTool(ctx.skills));
  hub.register(new SkillLoadMainTool(ctx.skills));
  hub.register(new SkillLoadReferenceTool(ctx.skills));
  hub.register(new SkillListToolsTool(ctx.skills));

  hub.register(new AskUserTool(hub));

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

  if (ctx.cron) {
    hub.register(new CronListTool(ctx.cron));
    hub.register(new CronAddTool(ctx.cron));
    hub.register(new CronDeleteTool(ctx.cron));
    hub.register(new CronPauseTool(ctx.cron));
    hub.register(new CronResumeTool(ctx.cron));
    hub.register(new CronRunNowTool(ctx.cron));
  }
}
