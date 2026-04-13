import { InnateToolHub } from '../innate-tools/innate-tool-hub';
import type { InnateTool, ToolDefinition } from '../innate-tools/types';
import type { KnowledgeHub } from './knowledge-hub';
import { KNOWLEDGE_TOOL_DEFINITIONS } from './knowledge-tool-definitions';

export class KnowledgeListTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_list;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const source = args['source'] as string | undefined;
    return this.hub.knowledge_list(source);
  }
}

export class KnowledgeAddTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_add;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const source = args['source'] as string;
    const title = args['title'] as string;
    const content = args['content'] as string;
    const metadata = args['metadata'] as Record<string, unknown> | undefined;
    return this.hub.knowledge_add(source, title, content, metadata);
  }
}

export class KnowledgeDeleteTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_delete;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const id = args['id'] as string;
    return this.hub.knowledge_delete(id);
  }
}

export class KnowledgeSearchTool implements InnateTool {
  readonly definition: ToolDefinition = KNOWLEDGE_TOOL_DEFINITIONS.knowledge_search;
  constructor(private hub: KnowledgeHub) {}
  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args['query'] as string;
    const topK = args['topK'] as number | undefined;
    return this.hub.knowledge_search(query, topK);
  }
}

export function registerKnowledgeTools(hub: InnateToolHub, knowledge: KnowledgeHub) {
  hub.register(new KnowledgeListTool(knowledge));
  hub.register(new KnowledgeAddTool(knowledge));
  hub.register(new KnowledgeDeleteTool(knowledge));
  hub.register(new KnowledgeSearchTool(knowledge));
}