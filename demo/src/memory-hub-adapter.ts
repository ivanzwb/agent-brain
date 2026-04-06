import type { AgentMemory } from '@biosbot/agent-memory';
import type { MemoryHub } from '../../src/memory/memory-hub';
import type { KnowledgeHub } from '../../src/knowledge/knowledge-hub';
import { KNOWLEDGE_TOOL_DEFINITIONS } from '../../src/knowledge/knowledge-tool-definitions';
import { MEMORY_TOOL_DEFINITIONS, CONVERSATION_TOOL_DEFINITIONS } from '../../src/memory/memory-tool-definitions';

const ALL_KNOWLEDGE_TOOL_DEFINITIONS = { ...KNOWLEDGE_TOOL_DEFINITIONS };
const ALL_MEMORY_TOOL_DEFINITIONS = { ...MEMORY_TOOL_DEFINITIONS, ...CONVERSATION_TOOL_DEFINITIONS };

export class MemoryHubAdapter implements MemoryHub, KnowledgeHub {
  constructor(private readonly mem: AgentMemory) {}

  getToolDefinition(toolName: string) {
    return ALL_KNOWLEDGE_TOOL_DEFINITIONS[toolName] ?? ALL_MEMORY_TOOL_DEFINITIONS[toolName];
  }

  hasTool(toolName: string): boolean {
    return toolName in ALL_KNOWLEDGE_TOOL_DEFINITIONS || toolName in ALL_MEMORY_TOOL_DEFINITIONS;
  }

  async conversation_track(role: string, content: string): Promise<void> {
    await this.mem.appendMessage(role as 'user' | 'assistant', content);
  }

  async conversation_search(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('conversation_search', args));
  }

  async conversation_compress(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('conversation_compress', args));
  }

  async memory_search(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('memory_search', args));
  }

  async memory_save(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('memory_save', args));
  }

  async memory_list(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('memory_list', args));
  }

  async memory_delete(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('memory_delete', args));
  }

  async memory_get_history(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('memory_get_history', args));
  }

  async memory_remember(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('memory_remember', args));
  }

  async knowledge_list(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('knowledge_list', args));
  }

  async knowledge_add(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('knowledge_add', args));
  }

  async knowledge_delete(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('knowledge_delete', args));
  }

  async knowledge_search(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('knowledge_search', args));
  }

  async knowledge_read(args: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.executeTool('knowledge_read', args));
  }
}
