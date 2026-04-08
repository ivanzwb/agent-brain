import { IHub } from '../types';

/**
 * KnowledgeHub — Knowledge base management interface
 *
 * Provides CRUD operations for structured knowledge, used for storing and retrieving reusable information documents
 */
export interface KnowledgeHub extends IHub {

    /**
     * List all entries in the knowledge base
     * @param category Optional, filter by category (e.g., tech, docs, FAQ, case)
     * @param limit Return count limit, default 20, max 100
     * @param offset Starting offset, default 0
     * @returns List of entries, each containing id, title, category, createdAt, etc.
     *
     * @example Return format:
     * ```json
     * {
     *   "items": [
     *     { "id": "kb_001", "title": "API Documentation", "category": "tech", "createdAt": "2024-01-01T00:00:00Z" }
     *   ],
     *   "total": 10,
     *   "hasMore": false
     * }
     * ```
     */
    knowledge_list(source?: string): Promise<string>;

    /**
     * Add new knowledge to the knowledge base
     * @param source Category tag (optional, e.g., tech, docs, FAQ, case)
     * @param title Knowledge title (required)
     * @param content Knowledge content (required, Markdown format)
     * @param tags Tag array (optional, for finer-grained retrieval)
     * @param metadata Additional metadata (optional, key-value pairs)
     * @returns Newly created entry info, including generated id
     *
     * @example Return format:
     * ```json
     * { "id": "kb_001", "status": "created", "title": "My Knowledge" }
     * ```
     */
    knowledge_add(source: string, title: string, content: string, metadata?: Record<string, unknown>): Promise<string>;

    /**
     * Delete specified entry from knowledge base
     * @param id Knowledge entry ID to delete (required)
     * @param force Force delete (default false, soft delete; true for physical delete)
     * @returns Delete result
     *
     * @example Return format:
     * ```json
     * { "status": "deleted", "id": "kb_001" }
     * ```
     */
    knowledge_delete(id: string, force?: boolean): Promise<string>;

    /**
     * Search for relevant content in the knowledge base
     * @param query Search keyword (required)
     * @param topK Number of results to return (default 5, max 50)
     * @param category Optional, filter by category
     * @param tags Optional, filter by tags
     * @param threshold Optional, relevance threshold (0-1)
     * @returns List of search results, each containing id, title, content, score
     *
     * @example Return format:
     * ```json
     * {
     *   "results": [
     *     { "id": "kb_001", "title": "Related Document", "content": "...", "score": 0.95 }
     *   ]
     * }
     * ```
     */
    knowledge_search(query: string, topK?: number, category?: string, tags?: string[], threshold?: number): Promise<string>;

}
