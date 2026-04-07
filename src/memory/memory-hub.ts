import { IHub } from '../types';

/**
 * MemoryHub — Unified memory management interface
 *
 * Provides two types of capabilities:
 * 1. Short-term memory: conversation message tracking, search, compression
 * 2. Long-term memory: semantic search, save, list, delete
 */
export interface MemoryHub extends IHub {

    // ==================== Short-term Memory (Conversation) ====================

    /**
     * Track conversation messages and store in short-term memory
     * @param conversationId Conversation ID (used to mark same conversation for later compression)
     * @param role Message role: 'user' | 'assistant' | 'system'
     * @param content Message content
     */
    conversation_track(conversationId: string, role: string, content: string): Promise<void>;

    /**
     * Search short-term memory (current conversation history)
     * @param args Search parameters
     * @param args.query Search text (required)
     * @param args.limit Return count (default 10)
     * @returns List of matching conversation messages
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
    conversation_search(args: Record<string, unknown>): Promise<string>;

    /**
     * Compress conversation history, retaining key information
     * @param args Compression parameters
     * @param args.keepLast Keep last N messages (default 10)
     * @param args.extractKeyPoints Whether to extract key points (default true)
     * @returns Compression result
     *
     * @example Return format:
     * ```json
     * { "status": "compressed", "keptCount": 10, "summary": "Discussed API authentication flow, user learned OAuth2" }
     * ```
     */
    conversation_compress(args: Record<string, unknown>): Promise<string>;

    // ==================== Long-term Memory ====================

    /**
     * Semantic search long-term memory
     * @param args Search parameters
     * @param args.query Search text (required)
     * @param args.topK Return count (default 5, max 50)
     * @param args.category Optional, filter by category
     * @returns List of search results
     *
     * @example Return format:
     * ```json
     * {
     *   "results": [
     *     { "id": "mem_001", "category": "preference", "key": "user_name", "value": "John", "score": 0.95 }
     *   ]
     * }
     * ```
     */
    memory_search(args: Record<string, unknown>): Promise<string>;

    /**
     * Save facts, preferences, or experiences to long-term memory
     * @param args Save parameters
     * @param args.key Memory identifier (required)
     * @param args.value Memory content (required)
     * @param args.category Category: preference | fact | episodic | procedural
     * @returns Save result
     *
     * @example Return format:
     * ```json
     * { "id": "mem_001", "status": "saved", "key": "user_name" }
     * ```
     */
    memory_save(args: Record<string, unknown>): Promise<string>;

    /**
     * List currently active memory entries
     * @param args List parameters
     * @param args.category Optional, filter by category
     * @param args.limit Return count (default 20, max 100)
     * @returns List of memory entries
     *
     * @example Return format:
     * ```json
     * {
     *   "items": [
     *     { "id": "mem_001", "category": "preference", "key": "user_name", "value": "John", "createdAt": "2024-01-01T00:00:00Z" }
     *   ]
     * }
     * ```
     */
    memory_list(args: Record<string, unknown>): Promise<string>;

    /**
     * Soft delete memory entry (mark as deleted, can be recovered)
     * @param args Delete parameters
     * @param args.id Memory ID to delete (required)
     * @returns Delete result
     *
     * @example Return format:
     * ```json
     * { "status": "deleted", "id": "mem_001" }
     * ```
     */
    memory_delete(args: Record<string, unknown>): Promise<string>;

    /**
     * Get recent conversation history
     * @param args Parameters
     * @param args.limit Number of messages to return (default 20, max 200)
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
    memory_get_history(args: Record<string, unknown>): Promise<string>;

}
