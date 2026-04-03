import type { SkillFramework, ToolDeclaration } from '@biosbot/agent-skills';
import type { ToolDefinition } from '../../src/innate-tools/types';
import type { SkillHub } from '../../src/skill/skill-hub';

// ============================================================
// SkillHubAdapter — 将 agent-skills (SkillFramework) 适配为 SkillHub 接口
//
// 映射关系：
//   SkillHub.getSkillsDescription()    → sf.listSkills()
//   SkillHub.getTools(skillName)       → sf.getSkillToolDeclarations(skillName)
//   SkillHub.execute(skill, tool, args)→ sf 暂无 runScript，返回工具声明信息
//   IHub.getToolDefinition(toolName)   → sf.getFrameworkToolDeclarations() 查找
//   IHub.hasTool(toolName)             → 同上
//
// HubTool 桥接方法（通过同名方法调用）：
//   skill_list / skill_install / skill_load_main /
//   skill_load_reference / skill_list_tools
// ============================================================

export class SkillHubAdapter implements SkillHub {
  /** 框架级工具定义缓存（skill_list, skill_install 等） */
  private frameworkToolMap: Map<string, ToolDefinition>;

  constructor(private readonly sf: SkillFramework) {
    this.frameworkToolMap = this.buildFrameworkToolMap();
  }

  // ----- IHub -----

  getToolDefinition(toolName: string): ToolDefinition | undefined {
    return this.frameworkToolMap.get(toolName);
  }

  hasTool(toolName: string): boolean {
    return this.frameworkToolMap.has(toolName);
  }

  // ----- SkillHub -----

  getSkillsDescription(): string[] {
    const { skills } = this.sf.listSkills();
    return skills.map(s => `${s.name}: ${s.description}`);
  }

  getTools(skillName: string): ToolDefinition[] {
    try {
      const decls = this.sf.getSkillToolDeclarations(skillName);
      return decls.map(d => this.toToolDefinition(d));
    } catch {
      return [];
    }
  }

  async execute(skillName: string, toolName: string, _args: Record<string, unknown>): Promise<string> {
    // 当前版本 agent-skills 尚无 runScript API，
    // 返回工具声明信息供 LLM 参考
    const tools = this.sf.listTools(skillName);
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Skill "${skillName}" has no tool "${toolName}"`);
    }
    return JSON.stringify({
      message: `Tool "${toolName}" from skill "${skillName}" is declared but script execution is not yet available in this agent-skills version.`,
      tool,
    });
  }

  // ----- HubTool 桥接方法 -----
  // AgentBrain 通过 HubTool 注册这些名字，HubTool.execute 会调用 (this as any)[toolName](args)

  async skill_list(_args: Record<string, unknown>): Promise<string> {
    const result = this.sf.listSkills();
    return JSON.stringify(result);
  }

  async skill_install(args: Record<string, unknown>): Promise<string> {
    const source = args['source'] as string;
    const entry = await this.sf.install(source);
    return JSON.stringify({ name: entry.name, status: entry.status });
  }

  async skill_load_main(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    const main = this.sf.loadMain(name);
    return JSON.stringify(main);
  }

  async skill_load_reference(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    const referencePath = args['referencePath'] as string;
    const ref = this.sf.loadReference(name, referencePath);
    return JSON.stringify(ref);
  }

  async skill_list_tools(args: Record<string, unknown>): Promise<string> {
    const name = args['name'] as string;
    const tools = this.sf.listTools(name);
    return JSON.stringify({ skillName: name, tools });
  }

  // ----- private -----

  private buildFrameworkToolMap(): Map<string, ToolDefinition> {
    const decls = this.sf.getFrameworkToolDeclarations();
    const map = new Map<string, ToolDefinition>();
    for (const d of decls) {
      map.set(d.name, this.toToolDefinition(d));
    }
    return map;
  }

  private toToolDefinition(decl: ToolDeclaration): ToolDefinition {
    return {
      name: decl.name,
      description: decl.description,
      parameters: decl.parameters as unknown as Record<string, unknown>,
    };
  }
}
