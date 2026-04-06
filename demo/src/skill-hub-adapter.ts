import type { SkillFramework, ToolDeclaration } from '@biosbot/agent-skills';
import type { ToolDefinition } from '../../src/innate-tools/types';
import type { SkillHub } from '../../src/skill/skill-hub';

const FRAMEWORK_TOOL_DECLARATIONS: ToolDefinition[] = [
  {
    name: 'skill_list',
    description: 'List all installed skills. Returns a list of available skills with their names and descriptions.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'skill_install',
    description: 'Install a new skill from a source (URL, npm package, or local path).',
    parameters: {
      type: 'object',
      properties: { source: { type: 'string', description: 'Source of the skill to install' } },
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

  async skill_list(_args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(this.sf.listSkills());
  }

  async skill_install(args: Record<string, unknown>): Promise<string> {
    const source = args['source'] as string;
    const entry = await this.sf.install(source);
    return JSON.stringify({ name: entry.name, status: entry.status });
  }

  async skill_load_main(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    return JSON.stringify(this.sf.loadMain(name));
  }

  async skill_load_reference(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    const referencePath = args['referencePath'] as string;
    return JSON.stringify(this.sf.loadReference(name, referencePath));
  }

  async skill_list_tools(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
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

  async execute(skillName: string, toolName: string, _args: Record<string, unknown>): Promise<string> {
    const tools = this.sf.listTools(skillName);
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Skill "${skillName}" has no tool "${toolName}"`);
    }
    return JSON.stringify({
      message: `Tool "${toolName}" from skill "${skillName}" is declared but script execution is not yet available.`,
      tool,
    });
  }

  private toToolDefinition(decl: ToolDeclaration): ToolDefinition {
    return {
      name: decl.name,
      description: decl.description,
      parameters: decl.parameters as unknown as Record<string, unknown>,
    };
  }
}
