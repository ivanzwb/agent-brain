import type {
  InnateTool,
  ToolDefinition,
} from './types';
import type { IHub } from '../types';

// ============================================================
// InnateToolHub — 天生工具的统一注册与调度中心
//
// 作为单一 InnateToolHub 注入 AgentBrain / ReactLoop，
// 将所有系统内建工具（搜索技能、安装技能、文件操作等）
// 聚合为统一的工具列表和执行入口。

export class InnateToolHub implements IHub {

  private readonly registry = new Map<string, InnateTool>();

  /**
   * 注册一个天生工具。
   * 工具名必须唯一，重复注册会抛出错误。
   */
  register(tool: InnateTool): this {
    const toolName = tool.definition.name;
    if (this.registry.has(toolName)) {
      throw new Error(`Innate tool "${toolName}" is already registered`);
    }
    this.registry.set(toolName, tool);
    return this;
  }

  /**
   * 批量注册天生工具。
   */
  registerAll(tools: InnateTool[]): this {
    for (const tool of tools) {
      this.register(tool);
    }
    return this;
  }

  /**
   * 注销一个天生工具。
   */
  unregister(toolName: string): boolean {
    return this.registry.delete(toolName);
  }

  getToolDefinition(toolName: string): ToolDefinition | undefined {
    return this.registry.get(toolName)?.definition;
  }

  hasTool(toolName: string): boolean {
    return this.registry.has(toolName);
  }
  getToolsDescription(): string[] {
    return Array.from(this.registry.values()).map(t => `${t.definition.name}: ${t.definition.description}`);
  }

  getTools(): ToolDefinition[] {
    return Array.from(this.registry.values()).map(t => t.definition);
  }

  async execute(toolName: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.registry.get(toolName);
    if (!tool) {
      throw new Error(`Unknown innate tool: ${toolName}`);
    }
    return tool.execute(args);
  }
}
