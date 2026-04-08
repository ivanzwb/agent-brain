import { ToolDefinition } from '../innate-tools/types';

/**
 * Knowledge Base tool Schema definitions
 * Used for managing and querying structured knowledge documents
 */
export const KNOWLEDGE_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  knowledge_list: {
    name: 'knowledge_list',
    description: 'List all entries in the knowledge base.',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Optional filter: only show entries in this category',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },

  knowledge_add: {
    name: 'knowledge_add',
    description: 'Add a new knowledge entry to the knowledge base.',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'Source or category for the knowledge entry',
        },
        title: {
          type: 'string',
          description: 'A concise, descriptive title for this knowledge entry',
        },
        content: {
          type: 'string',
          description: 'The main content in Markdown format',
        },
        metadata: {
          type: 'object',
          description: 'Optional additional metadata as key-value pairs',
        },
      },
      required: ['source', 'title', 'content'],
      additionalProperties: false,
    },
  },

  knowledge_delete: {
    name: 'knowledge_delete',
    description: 'Delete a knowledge base entry by its ID.',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique ID of the knowledge entry to delete',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  knowledge_search: {
    name: 'knowledge_search',
    description: 'Semantic search through the knowledge base.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query',
        },
        topK: {
          type: 'number',
          description: 'Maximum number of results to return',
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
};