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

  async conversation_track(conversationId: string, role: string, content: string): Promise<void> {
    await this.mem.appendMessage(conversationId, role as 'user' | 'assistant', content);
  }

  async conversation_search(query: string, limit?: number): Promise<string> {
    const topK = limit ?? 10;
    const results = await this.mem.searchConversation(query, topK);
    return JSON.stringify({ results });
  }

  async conversation_history(limit?: number): Promise<string> {
    const messages = await this.mem.getConversationHistory(limit);
    return JSON.stringify({ messages });
  }

  async memory_search(query: string, topK?: number): Promise<string> {
    const results = await this.mem.searchMemory(query, topK);
    return JSON.stringify({ results });
  }

  async memory_save(key: string, value: string): Promise<string> {
    // 默认使用 'fact' 类别，置信度 1.0
    const id = await this.mem.saveMemory('fact', key, value, 1.0);
    return JSON.stringify({ id, status: 'saved', key });
  }

  async memory_history(limit?: number): Promise<string> {
    const items = await this.mem.listMemories();
    const sliced = typeof limit === 'number' ? items.slice(0, limit) : items;
    return JSON.stringify({ items: sliced });
  }

  async memory_delete(id: string): Promise<string> {
    await this.mem.deleteMemory(id);
    return JSON.stringify({ status: 'deleted', id });
  }

  async knowledge_list(source?: string): Promise<string> {
    return JSON.stringify(this.mem.listKnowledge(source));
  }

  async knowledge_add(source: string, title: string, content: string, metadata?: Record<string, unknown>): Promise<string> {
    return JSON.stringify(await this.mem.addKnowledge(source, title, content, metadata));
  }

  async knowledge_delete(id: string): Promise<string> {
    return JSON.stringify(await this.mem.removeKnowledge(id));
  }

  async knowledge_search(query: string, topK = 5): Promise<string> {
    return JSON.stringify(await this.mem.searchKnowledge(query, topK));
  }
}
