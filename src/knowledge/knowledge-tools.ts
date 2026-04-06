import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { KnowledgeHub } from './knowledge-hub';
import { KNOWLEDGE_TOOL_DEFINITIONS } from './knowledge-tool-definitions';

export class KnowledgeListTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_list;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.knowledge_list(args);
  }
}

export class KnowledgeAddTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_add;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.knowledge_add(args);
  }
}

export class KnowledgeDeleteTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_delete;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.knowledge_delete(args);
  }
}

export class KnowledgeSearchTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_search;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.knowledge_search(args);
  }
}

export class KnowledgeReadTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_read;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    return this.hub.knowledge_read(args);
  }
}
