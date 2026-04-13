import { ToolDefinition } from '../innate-tools/types';

/**
 * Conversation + long-term memory tool schemas: **capability boundaries** only.
 * When to prefer conversation vs memory vs ask_user: `fragments/conversation-business.md`. **`memory_*` usage**: `fragments/memory-business.md`.
 */
export const CONVERSATION_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  conversation_track: {
    name: 'conversation_track',
    description:
      'Appends one message to the **short-term conversation log** for a given `conversationId`. **Mutates** stored session history. Roles: user | assistant | system.',
    parameters: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'Conversation/session id used to group messages',
        },
        role: {
          type: 'string',
          description: 'Message role',
          enum: ['user', 'assistant', 'system'],
        },
        content: {
          type: 'string',
          description: 'Message body text',
        },
      },
      required: ['conversationId', 'role', 'content'],
      additionalProperties: false,
    },
  },

  conversation_search: {
    name: 'conversation_search',
    description:
      '**Keyword-style search** over messages already stored for this conversation. Output: matching excerpts/metadata (implementation-defined). Does **not** search long-term memory.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search string',
        },
        limit: {
          type: 'integer',
          description: 'Max matches (default: 10, max: 50)',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  conversation_history: {
    name: 'conversation_history',
    description:
      'Returns the **most recent N** messages for this conversation in chronological order. **No query string**—pure tail fetch.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Max messages (default: 20, max: 200)',
          default: 20,
          minimum: 1,
          maximum: 200,
        },
      },
      additionalProperties: false,
    },
  },
};

export const MEMORY_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  memory_search: {
    name: 'memory_search',
    description:
      '**Semantic search** over the **long-term** memory store. Output: ranked hits (e.g. with scores). Does **not** read arbitrary conversation logs.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural-language query',
        },
        topK: {
          type: 'integer',
          description: 'Max results (default: 5, max: 50)',
          default: 5,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  memory_save: {
    name: 'memory_save',
    description:
      'Writes or updates a **key → value** entry in long-term memory. **Mutates** persistent store.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Stable key / id for the record',
        },
        value: {
          type: 'string',
          description: 'Stored payload (text or serialized content)',
        },
      },
      required: ['key', 'value'],
      additionalProperties: false,
    },
  },

  memory_history: {
    name: 'memory_history',
    description:
      'Lists stored long-term memory entries up to **limit**. Not semantic search.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Max entries (default: 20, max: 100)',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
      },
      additionalProperties: false,
    },
  },

  memory_delete: {
    name: 'memory_delete',
    description:
      '**Soft-deletes** one long-term memory record by **id**. **Mutates** store (tombstone / flag).',
    parameters: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Memory record id from search/list results',
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
};
