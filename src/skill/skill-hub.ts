import type { IHub } from '../types';
import type { ToolDefinition } from '../innate-tools/types';

// ============================================================
// SkillHub — Unified skill registration, query, and scheduling center
//
// AgentBrain and ReactLoop interact with skills through SkillHub.
// When the innate tool (install_skill) installs a new skill and calls SkillHub.install(),
// the next ReactLoop iteration can perceive the new skill.
// ============================================================

export interface SkillHub extends IHub {
    /** Find skills from the online registry by keyword */
    skill_find(keyword: string): Promise<string>;
    /** List all locally installed skills */
    skill_list(): Promise<string>;
    /** Install a skill from registry, npm, URL, or local path */
    skill_install(name: string): Promise<string>;
    /** Load skill's main context */
    skill_load_main(name: string): Promise<string>;
    /** Load skill's reference files */
    skill_load_reference(name: string, referencePath: string): Promise<string>;
    /** List tools provided by a skill */
    skill_list_tools(name: string): Promise<string>;
    /** Get description text list of all installed skills */
    getSkillsDescription(): string[];
    /** Get tool definitions provided by all installed skills */
    getTools(skillName: string): ToolDefinition[];
    /** Execute a tool from a specific skill */
    execute(skillName: string, toolName: string, args: Record<string, unknown>): Promise<string>;
}


// ============================================================
// Skill Declaration — Describes the capability boundaries of a skill package
// ============================================================

/** Skill declaration: describes the domain knowledge and use cases behind a set of tools */
export interface SkillDeclaration {
  /** Skill name */
  name: string;
  /** Skill description */
  description: string;
}

export interface SkillFindArgs {
  query: string;
  [key: string]: unknown;
}

export interface SkillListArgs {
  [key: string]: unknown;
}

export interface SkillInstallArgs {
  source: string;
  [key: string]: unknown;
}

export interface SkillLoadMainArgs {
  name: string;
  [key: string]: unknown;
}

export interface SkillLoadReferenceArgs {
  name: string;
  referencePath: string;
  [key: string]: unknown;
}

export interface SkillListToolsArgs {
  name: string;
  [key: string]: unknown;
}
