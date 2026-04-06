import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { SkillHub } from './skill-hub';
import { SKILL_TOOL_DEFINITIONS } from './skill-tool-definitions';

export class SkillListTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_list;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.skill_list(args);
  }
}

export class SkillInstallTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_install;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.skill_install(args);
  }
}

export class SkillLoadMainTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_load_main;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.skill_load_main(args);
  }
}

export class SkillLoadReferenceTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_load_reference;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.skill_load_reference(args);
  }
}

export class SkillListToolsTool implements InnateTool {
  readonly definition: ToolDefinition = SKILL_TOOL_DEFINITIONS.skill_list_tools;
  constructor(private hub: SkillHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.skill_list_tools(args);
  }
}
