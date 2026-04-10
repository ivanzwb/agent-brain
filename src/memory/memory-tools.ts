import { register } from 'module';
import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { MemoryHub } from './memory-hub';
import { MEMORY_TOOL_DEFINITIONS, CONVERSATION_TOOL_DEFINITIONS } from './memory-tool-definitions';
import { InnateToolHub } from '../innate-tools/innate-tool-hub';

export class MemorySearchTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_search;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args['query'] as string;
    const topK = args['topK'] as number | undefined;
    return this.hub.memory_search(query, topK);
  }
}

export class MemorySaveTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_save;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const key = args['key'] as string;
    const value = args['value'] as string;
    return this.hub.memory_save(key, value);
  }
}

export class MemoryHistoryTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_history;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const limit = args['limit'] as number | undefined;
    return this.hub.memory_history(limit);
  }
}

export class MemoryDeleteTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_delete;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.memory_delete(id);
  }
}

export class ConversationTrackTool implements InnateTool {
  readonly definition: ToolDefinition = CONVERSATION_TOOL_DEFINITIONS.conversation_track;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const conversationId = args['conversationId'] as string;
    const role = args['role'] as string;
    const content = args['content'] as string;
    await this.hub.conversation_track(conversationId, role, content);
    return JSON.stringify({ status: 'tracked', conversationId });
  }
}

export class ConversationSearchTool implements InnateTool {
  readonly definition: ToolDefinition = CONVERSATION_TOOL_DEFINITIONS.conversation_search;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args['query'] as string;
    const limit = args['limit'] as number | undefined;
    return this.hub.conversation_search(query, limit);
  }
}

export class ConversationHistoryTool implements InnateTool {
  readonly definition: ToolDefinition = CONVERSATION_TOOL_DEFINITIONS.conversation_history;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const limit = args['limit'] as number | undefined;
    return this.hub.conversation_history(limit);
  }
}

export function registerMemoryTools(hub: InnateToolHub, memory: MemoryHub) {
  hub.register(new ConversationTrackTool(memory));
  hub.register(new ConversationSearchTool(memory));
  hub.register(new ConversationHistoryTool(memory));
  hub.register(new MemorySearchTool(memory));
  hub.register(new MemorySaveTool(memory));
  hub.register(new MemoryHistoryTool(memory));
  hub.register(new MemoryDeleteTool(memory));
}