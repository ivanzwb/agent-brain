import type { AgentMemory } from '@biosbot/agent-memory';
import type { ToolDefinition } from '../../src/innate-tools/types';
import type { MemoryHub } from '../../src/memory/memory-hub';

// ============================================================
// MemoryHubAdapter — 将 agent-memory 适配为 MemoryHub 接口
// ============================================================

/**
 * agent-memory 的工具定义映射到框架的 ToolDefinition。
 * 只桥接 knowledge_search 和 knowledge_read 两个工具。
 */
const KNOWLEDGE_TOOLS: Record<string, ToolDefinition> = {
  knowledge_search: {
    name: 'knowledge_search',
    description: 'Search the knowledge base for relevant information',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query' },
        topK: { type: 'number', description: 'Maximum number of results (default: 5)' },
      },
      required: ['query'],
    },
  },
  knowledge_read: {
    name: 'knowledge_read',
    description: 'Read the full content of a knowledge chunk by ID',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The knowledge chunk ID' },
      },
      required: ['id'],
    },
  },
};

export class MemoryHubAdapter implements MemoryHub {
  constructor(private readonly mem: AgentMemory) {}

  // ----- IHub -----

  getToolDefinition(toolName: string): ToolDefinition | undefined {
    return KNOWLEDGE_TOOLS[toolName];
  }

  hasTool(toolName: string): boolean {
    return toolName in KNOWLEDGE_TOOLS;
  }

  // ----- MemoryHub -----

  async searchMemory(query: string): Promise<{ text: string; tokenCount: number }> {
    const ctx = await this.mem.assembleContext(query);
    return { text: ctx.text, tokenCount: ctx.tokenCount };
  }

  async trackMessage(role: string, content: string): Promise<void> {
    await this.mem.appendMessage(role as 'user' | 'assistant', content);
  }

  // ----- HubTool 桥接方法 -----
  // HubTool 通过 (this as any)[toolName](args) 调用，需要同名方法

  async knowledge_search(args: Record<string, unknown>): Promise<string> {
    const result = await this.mem.executeTool('knowledge_search', args);
    return JSON.stringify(result);
  }

  async knowledge_read(args: Record<string, unknown>): Promise<string> {
    const result = await this.mem.executeTool('knowledge_read', args);
    return JSON.stringify(result);
  }
}
