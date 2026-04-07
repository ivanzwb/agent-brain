import { ToolDefinition } from '../innate-tools/types';

/**
 * Knowledge Base tool Schema definitions
 * Used for managing and querying structured knowledge documents
 */
export const KNOWLEDGE_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  knowledge_list: {
    name: 'knowledge_list',
    description: 'List all entries in the knowledge base. Returns a paginated list with basic metadata (ID, title, category, creation date). Use this to browse available knowledge or find entries by category.',
    parameters: {
      type: 'object',
      properties: {
        category: { 
          type: 'string', 
          description: 'Optional filter: only show entries in this category (e.g., "tech", "docs", "FAQ", "case")' 
        },
        limit: { 
          type: 'number', 
          description: 'Maximum number of entries to return per page (default: 20, max: 100)' 
        },
        offset: { 
          type: 'number', 
          description: 'Number of entries to skip for pagination (default: 0). Use with limit for paginated access.' 
        },
      },
      required: [],
      additionalProperties: false,
    },
  },

  knowledge_add: {
    name: 'knowledge_add',
    description: 'Add a new knowledge entry to the knowledge base. Use this to store structured information, documentation, FAQs, or any content that should be retrievable via semantic search. The content supports Markdown formatting.',
    parameters: {
      type: 'object',
      properties: {
        title: { 
          type: 'string', 
          description: 'A concise, descriptive title for this knowledge entry. Should summarize the main topic (e.g., "API Authentication Guide", "Deployment FAQ")' 
        },
        content: { 
          type: 'string', 
          description: 'The main content in Markdown format. Include detailed explanations, code examples, steps, etc. This is what will be searched and retrieved.' 
        },
        category: { 
          type: 'string', 
          description: 'Category tag for organizing knowledge (e.g., "tech", "docs", "FAQ", "case", "product"). Helps with filtering during retrieval.' 
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Optional tags for more granular organization (e.g., ["api", "rest", "auth", "v2"]). Useful for targeted searches.' 
        },
        metadata: { 
          type: 'object', 
          description: 'Optional additional metadata as key-value pairs (e.g., { "author": "John", "version": "1.0", "lastUpdated": "2024-01-01" }). Can store any custom fields.' 
        },
      },
      required: ['title', 'content'],
      additionalProperties: false,
    },
  },

  knowledge_delete: {
    name: 'knowledge_delete',
    description: 'Delete a knowledge base entry by its ID. Supports soft delete (default) which marks the entry as deleted but allows recovery, or hard delete which permanently removes it.',
    parameters: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'The unique ID of the knowledge entry to delete (obtained from knowledge_list or knowledge_search results)' 
        },
        force: { 
          type: 'boolean', 
          description: 'If true, permanently delete the entry. If false (default), perform a soft delete that can be recovered.' 
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  knowledge_search: {
    name: 'knowledge_search',
    description: 'Semantic search through the knowledge base. Uses vector similarity to find the most relevant knowledge entries. Returns results ranked by relevance score. Best for finding specific information or answers.',
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: 'Natural language search query. Describe what information you are looking for (e.g., "how to authenticate API requests", "deployment steps")' 
        },
        topK: { 
          type: 'number', 
          description: 'Maximum number of results to return (default: 5, max: 50)' 
        },
        category: { 
          type: 'string', 
          description: 'Optional filter: restrict search to a specific category' 
        },
        tags: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Optional filter: only return entries that have any of these tags' 
        },
        threshold: { 
          type: 'number', 
          description: 'Minimum relevance score threshold (0-1). Only return results with score >= threshold (default: 0.0, returns all matches)' 
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  knowledge_read: {
    name: 'knowledge_read',
    description: 'Retrieve the full content of a specific knowledge entry by its ID. Use this when you know the entry ID and need to read its complete content, including all Markdown formatting and details.',
    parameters: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'The unique ID of the knowledge entry to read (obtained from knowledge_list or knowledge_search results)' 
        },
        includeMetadata: { 
          type: 'boolean', 
          description: 'If true, includes full metadata in the response (author, version, tags, etc.). Default false for a cleaner response.' 
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
};