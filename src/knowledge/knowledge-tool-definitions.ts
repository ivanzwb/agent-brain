import { ToolDefinition } from '../innate-tools/types';

/**
 * Knowledge-base tool schemas: **capability boundaries** (CRUD + search over the KB store).
 */
export const KNOWLEDGE_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  knowledge_list: {
    name: 'knowledge_list',
    description:
      'Lists entries in the local knowledge base. Optional **source** filter. Does **not** perform semantic search.',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Optional category / source filter',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },

  knowledge_add: {
    name: 'knowledge_add',
    description:
      'Creates a knowledge entry (**source**, **title**, **content**). **Mutates** the KB. Optional **metadata** object.',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Category or source label',
        },
        title: {
          type: 'string',
          description: 'Entry title',
        },
        content: {
          type: 'string',
          description: 'Body (often Markdown)',
        },
        metadata: {
          type: 'object',
          description: 'Optional key-value metadata',
        },
      },
      required: ['source', 'title', 'content'],
      additionalProperties: false,
    },
  },

  knowledge_delete: {
    name: 'knowledge_delete',
    description: 'Deletes one KB entry by **id**. **Mutates** the store.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Entry id',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  knowledge_search: {
    name: 'knowledge_search',
    description:
      '**Semantic search** over KB **content**. Input: **query**; optional **topK** cap on hits.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        topK: {
          type: 'number',
          description: 'Max results',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
};
