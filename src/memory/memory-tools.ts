import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { MemoryHub } from './memory-hub';
import { MEMORY_TOOL_DEFINITIONS, CONVERSATION_TOOL_DEFINITIONS } from './memory-tool-definitions';

export class MemorySearchTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_search;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.memory_search(args);
  }
}

export class MemorySaveTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_save;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.memory_save(args);
  }
}

export class MemoryListTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_list;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.memory_list(args);
  }
}

export class MemoryDeleteTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_delete;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.memory_delete(args);
  }
}

export class MemoryGetHistoryTool implements InnateTool {
  readonly definition: ToolDefinition = MEMORY_TOOL_DEFINITIONS.memory_get_history;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.memory_get_history(args);
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
    return this.hub.conversation_search(args);
  }
}

export class ConversationCompressTool implements InnateTool {
  readonly definition: ToolDefinition = CONVERSATION_TOOL_DEFINITIONS.conversation_compress;
  constructor(private hub: MemoryHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.conversation_compress(args);
  }
}
