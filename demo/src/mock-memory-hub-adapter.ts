import type { ToolDefinition } from '../../src/innate-tools/types';
import type { MemoryHub } from '../../src/memory/memory-hub';

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

export class MockMemoryHubAdapter implements MemoryHub {
  getToolDefinition(toolName: string): ToolDefinition | undefined {
    return KNOWLEDGE_TOOLS[toolName];
  }

  hasTool(toolName: string): boolean {
    return toolName in KNOWLEDGE_TOOLS;
  }

  async searchMemory(_query: string): Promise<{ text: string; tokenCount: number }> {
    return { text: '', tokenCount: 0 };
  }

  async trackMessage(_role: string, _content: string): Promise<void> {}

  async knowledge_search(_args: Record<string, unknown>): Promise<string> {
    return JSON.stringify({ results: [], message: 'No knowledge base configured' });
  }

  async knowledge_read(_args: Record<string, unknown>): Promise<string> {
    return JSON.stringify({ content: null, message: 'No knowledge base configured' });
  }
}
