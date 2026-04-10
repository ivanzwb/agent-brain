import { InnateToolHub } from '../innate-tools/innate-tool-hub';
import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { SkillHub } from './skill-hub';
import { SKILL_TOOL_DEFINITIONS } from './skill-tool-definitions';

export class SkillFindTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_find;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args['query'] as string;
    return this.hub.skill_find(query);
  }
}

export class SkillListTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_list;
  constructor(private hub: SkillHub) {}
  async execute(_args: Record<string, unknown>): Promise<string> {
    return this.hub.skill_list();
  }
}

export class SkillInstallTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_install;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const source = args['source'] as string;
    return this.hub.skill_install(source);
  }
}

export class SkillLoadMainTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_load_main;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    return this.hub.skill_load_main(name);
  }
}

export class SkillLoadReferenceTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_load_reference;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    const referencePath = args['referencePath'] as string;
    return this.hub.skill_load_reference(name, referencePath);
  }
}

export class SkillListToolsTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_list_tools;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    return this.hub.skill_list_tools(name);
  }
}

export function registerSkillTools(hub: InnateToolHub, skills: SkillHub) {
  hub.register(new SkillFindTool(skills));
  hub.register(new SkillListTool(skills));
  hub.register(new SkillInstallTool(skills));
  hub.register(new SkillLoadMainTool(skills));
  hub.register(new SkillLoadReferenceTool(skills));
  hub.register(new SkillListToolsTool(skills));
}
