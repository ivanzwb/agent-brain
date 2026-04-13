import { IHub } from '../types';

/**
 * MemoryHub — Unified memory management interface
 *
 * Provides two types of capabilities:
 * 1. Short-term memory: conversation message tracking and search
 * 2. Long-term memory: semantic search, save, list, delete
 */
export interface MemoryHub extends IHub {

    // ==================== Short-term Memory (Conversation) ====================

    /**
     * Track conversation messages and store in short-term memory
     * @param conversationId Conversation ID (session / thread grouping)
     * @param role Message role: 'user' | 'assistant' | 'system'
     * @param content Message content
     */
    conversation_track(conversationId: string, role: string, content: string): Promise<void>;

    /**
     * Search short-term memory (current conversation history)
     * @param query Search text (required)
     * @param limit Return count (default 10)
     * @returns List of matching conversation messages as JSON string
     *
     * @example Return format:
     * ```json
     * {
     *   "results": [
     *     { "role": "user", "content": "question about API", "timestamp": "2024-01-01T10:00:00Z" },
     *     { "role": "assistant", "content": "here is the API documentation...", "timestamp": "2024-01-01T10:01:00Z" }
     *   ]
     * }
     * ```
     */
    conversation_search(query: string, limit?: number): Promise<string>;

    /**
     * Get recent conversation history
     * @param limit Number of messages to return (default 20, max 200)
     * @returns List of conversation history
     *
     * @example Return format:
     * ```json
     * {
     *   "messages": [
     *     { "role": "user", "content": "hello", "timestamp": "2024-01-01T10:00:00Z" },
     *     { "role": "assistant", "content": "hello", "timestamp": "2024-01-01T10:00:01Z" }
     *   ]
     * }
     * ```
     */
    conversation_history(limit?: number): Promise<string>;

    // ==================== Long-term Memory ====================

    /**
     * Semantic search long-term memory
     * @param query Search text (required)
     * @param topK Return count (default 5, max 50)
     * @returns List of search results as JSON string
     *
     * @example Return format:
     * ```json
     * {
     *   "results": [
     *     { "id": "mem_001", "key": "user_name", "value": "John", "score": 0.95 }
     *   ]
     * }
     * ```
     */
    memory_search(query: string, topK?: number): Promise<string>;

    /**
     * Save facts, preferences, or experiences to long-term memory
     * @param key Memory identifier (required)
     * @param value Memory content (required)
     * @returns Save result as JSON string
     *
     * @example Return format:
     * ```json
     * { "id": "mem_001", "status": "saved", "key": "user_name" }
     * ```
     */
    memory_save(key: string, value: string): Promise<string>;

    /**
     * Get recent active memory entries
     * @param limit Return count (default 20, max 100)
     * @returns List of memory entries as JSON string
     *
     * @example Return format:
     * ```json
     * {
     *   "items": [
     *     { "id": "mem_001", "key": "user_name", "value": "John", "createdAt": "2024-01-01T00:00:00Z" }
     *   ]
     * }
     * ```
     */
    memory_history(limit?: number): Promise<string>;

    /**
     * Soft delete memory entry (mark as deleted, can be recovered)
     * @param id Memory ID to delete (required)
     * @returns Delete result
     *
     * @example Return format:
     * ```json
     * { "status": "deleted", "id": "mem_001" }
     * ```
     */
    memory_delete(id: string): Promise<string>;
}
