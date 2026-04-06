import { ToolDefinition } from '../innate-tools/types';

/**
 * Conversation (Short-term Memory) 工具的 Schema 定义
 * 用于跟踪、搜索和压缩会话历史
 */
export const CONVERSATION_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  conversation_track: {
    name: 'conversation_track',
    description: 'Track a conversation message to short-term memory. Use this at the end of each conversation turn to record the message for future retrieval.',
    parameters: {
      type: 'object',
      properties: {
        role: { 
          type: 'string', 
          description: 'Message role in the conversation: user (human), assistant (AI), or system (system message)',
          enum: ['user', 'assistant', 'system'],
        },
        content: { 
          type: 'string', 
          description: 'The actual message content/text that was exchanged in the conversation' 
        },
      },
      required: ['role', 'content'],
      additionalProperties: false,
    },
  },

  conversation_search: {
    name: 'conversation_search',
    description: 'Search through the current conversation history (short-term memory). Use this when you need to find specific information that was mentioned earlier in the current session. Returns matching messages with their timestamps.',
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: 'The search query - keywords or phrases to look for in the conversation history' 
        },
        limit: { 
          type: 'integer', 
          description: 'Maximum number of matching messages to return (default: 10, max: 50)',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  conversation_compress: {
    name: 'conversation_compress',
    description: 'Compress the conversation history into long-term memory while preserving key information. This reduces token usage by summarizing the conversation and storing important points. The compressed summary becomes available for future sessions.',
    parameters: {
      type: 'object',
      properties: {
        keepLast: { 
          type: 'integer', 
          description: 'Number of most recent messages to keep verbatim in short-term memory (default: 10, max: 100). These remain accessible for the current session.',
          default: 10,
          minimum: 1,
          maximum: 100,
        },
        extractKeyPoints: { 
          type: 'boolean', 
          description: 'Whether to extract and summarize key points from the conversation (default: true). If true, generates a concise summary and stores it in long-term memory.',
          default: true,
        },
      },
      additionalProperties: false,
    },
  },
};

/**
 * Memory (Long-term Memory) 工具的 Schema 定义
 * 用于持久化存储和检索重要信息、偏好、事实等
 */
export const MEMORY_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  memory_search: {
    name: 'memory_search',
    description: 'Semantic search through long-term memory. Use this to find previously stored information, facts, preferences, or past experiences. Returns results ranked by relevance with similarity scores.',
    parameters: {
      type: 'object',
      properties: {
        query: { 
          type: 'string', 
          description: 'Natural language query describing what you are looking for (e.g., "user preferences for UI", "meeting about project X")' 
        },
        topK: { 
          type: 'integer', 
          description: 'Maximum number of results to return (default: 5, max: 50)',
          default: 5,
          minimum: 1,
          maximum: 50,
        },
        category: { 
          type: 'string', 
          description: 'Optional filter: restrict search to a specific memory category',
          enum: ['preference', 'fact', 'episodic', 'procedural'],
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },

  memory_save: {
    name: 'memory_save',
    description: 'Save a specific piece of information to long-term memory. Use this to remember important facts, user preferences, or procedural knowledge that should persist across sessions.',
    parameters: {
      type: 'object',
      properties: {
        key: { 
          type: 'string', 
          description: 'A short, unique identifier for this memory (e.g., "user_theme", "api_key_location", "meeting_schedule"). Used for quick lookup later.' 
        },
        value: { 
          type: 'string', 
          description: 'The actual content/fact to remember. Can be plain text or structured information.' 
        },
        category: { 
          type: 'string', 
          description: 'Classification of the memory for better organization and retrieval',
          enum: ['preference', 'fact', 'episodic', 'procedural'],
        },
      },
      required: ['key', 'value', 'category'],
      additionalProperties: false,
    },
  },

  memory_list: {
    name: 'memory_list',
    description: 'List all memories currently stored in long-term memory. Use this to see what information has been saved. Can filter by category to show specific types of memories.',
    parameters: {
      type: 'object',
      properties: {
        category: { 
          type: 'string', 
          description: 'Optional filter: only show memories of this category',
          enum: ['preference', 'fact', 'episodic', 'procedural'],
        },
        limit: { 
          type: 'integer', 
          description: 'Maximum number of memories to return (default: 20, max: 100)',
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
    description: 'Soft-delete a memory from long-term memory. The memory is marked as deleted but can be recovered. Use this when information becomes outdated or is no longer relevant.',
    parameters: {
      type: 'object',
      properties: {
        id: { 
          type: 'string', 
          description: 'The unique memory ID to delete (obtained from memory_list or memory_search results)' 
        },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },

  memory_get_history: {
    name: 'memory_get_history',
    description: 'Retrieve the recent conversation history from short-term memory. Use this to recall what was discussed earlier in the current session for context continuity.',
    parameters: {
      type: 'object',
      properties: {
        limit: { 
          type: 'integer', 
          description: 'Maximum number of recent messages to retrieve (default: 20, max: 200)',
          default: 20,
          minimum: 1,
          maximum: 200,
        },
      },
      additionalProperties: false,
    },
  },
};