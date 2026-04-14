import type { SkillFramework, ToolDeclaration } from '@biosbot/agent-skills';
import { SkillFramework as SkillFrameworkClass } from '@biosbot/agent-skills';
import type { ToolDefinition } from '../../src/innate-tools/types';
import type { SkillHub } from '../../src/skill/skill-hub';

const FRAMEWORK_TOOL_DECLARATIONS: ToolDefinition[] = [
  {
    name: 'skill_find',
    description: 'Search for available skills from the online skill registry by keyword.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search keyword or phrase to find relevant skills' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'skill_list',
    description: 'List all locally installed skills. Returns a list of available skills with their names and descriptions.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'skill_install',
    description: 'Install a skill from the online registry or a direct source. Accepts a skill name from skill_find, npm package, URL, or local path.',
    parameters: {
      type: 'object',
      properties: { source: { type: 'string', description: 'Skill name from skill_find results, npm package name, URL, or local file path' } },
      required: ['source'],
      additionalProperties: false,
    },
  },
  {
    name: 'skill_load_main',
    description: 'Load the main context file (main.md) of a skill.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Name of the skill' } },
      required: ['name'],
      additionalProperties: false,
    },
  },
  {
    name: 'skill_load_reference',
    description: 'Load a reference file from a skill\'s reference directory.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the skill' },
        referencePath: { type: 'string', description: 'Relative path to the reference file' },
      },
      required: ['name', 'referencePath'],
      additionalProperties: false,
    },
  },
  {
    name: 'skill_list_tools',
    description: 'List all tools provided by a specific skill.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Name of the skill' } },
      required: ['name'],
      additionalProperties: false,
    },
  },
];

export class SkillHubAdapter implements SkillHub {
  private toolMap: Map<string, ToolDefinition>;

  constructor(private readonly sf: SkillFramework) {
    this.toolMap = new Map(FRAMEWORK_TOOL_DECLARATIONS.map(d => [d.name, d]));
  }

  getToolDefinition(toolName: string): ToolDefinition | undefined {
    return this.toolMap.get(toolName);
  }

  hasTool(toolName: string): boolean {
    return this.toolMap.has(toolName);
  }

  async skill_find(query: string): Promise<string> {
    const results = await SkillFrameworkClass.searchSkills(query);
    return JSON.stringify(results);
  }

  async skill_list(): Promise<string> {
    return JSON.stringify(this.sf.listSkills());
  }

  async skill_install(source: string): Promise<string> {
    const fs = await import('fs');
    const entry = fs.existsSync(source) && fs.statSync(source).isDirectory()
      ? await this.sf.install(source)
      : await this.sf.installFromNetwork(source);
    return JSON.stringify({ name: entry.name, status: entry.status });
  }

  async skill_load_main(name: string): Promise<string> {
    return JSON.stringify(this.sf.loadMain(name));
  }

  async skill_load_reference(name: string, referencePath: string): Promise<string> {
    return JSON.stringify(this.sf.loadReference(name, referencePath));
  }

  async skill_list_tools(name: string): Promise<string> {
    return JSON.stringify({ skillName: name, tools: this.sf.listTools(name) });
  }

  getSkillsDescription(): string[] {
    const { skills } = this.sf.listSkills();
    return skills.map(s => `${s.name}: ${s.description}`);
  }

  getTools(skillName: string): ToolDefinition[] {
    try {
      return this.sf.getSkillToolDeclarations(skillName).map(d => this.toToolDefinition(d));
    } catch {
      return [];
    }
  }

  async execute(skillName: string, toolName: string, args: Record<string, unknown>): Promise<string> {
    const tools = this.sf.listTools(skillName);
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Skill "${skillName}" has no tool "${toolName}"`);
    }

    const { stdout, stderr, exitCode } = await this.sf.runScript({
      name: skillName,
      toolName,
      args: JSON.stringify(args ?? {}),
    });

    const output = String(stdout ?? '').trim();
    if (output) return output;

    const err = String(stderr ?? '').trim();
    if (exitCode !== 0 || err) {
      throw new Error(
        `Skill script failed (${skillName}.${toolName}) exit=${exitCode}: ${err || 'no stderr'}`,
      );
    }

    throw new Error(`Skill "${skillName}" tool "${toolName}" returned no output`);
  }

  private toToolDefinition(decl: ToolDeclaration): ToolDefinition {
    return {
      name: decl.name,
      description: decl.description,
      parameters: decl.parameters as unknown as Record<string, unknown>,
    };
  }
}
