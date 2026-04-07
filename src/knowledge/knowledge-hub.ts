import { IHub } from '../types';

/**
 * KnowledgeHub — Knowledge base management interface
 *
 * Provides CRUD operations for structured knowledge, used for storing and retrieving reusable information documents
 */
export interface KnowledgeHub extends IHub {

    /**
     * List all entries in the knowledge base
     * @param args Query parameters
     * @param args.category Optional, filter by category (e.g., tech, docs, FAQ, case)
     * @param args.limit Return count limit, default 20, max 100
     * @param args.offset Starting offset, default 0
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
    knowledge_list(args: Record<string, unknown>): Promise<string>;

    /**
     * Add new knowledge to the knowledge base
     * @param args Knowledge entry content
     * @param args.title Knowledge title (required)
     * @param args.content Knowledge content (required, Markdown format)
     * @param args.category Category tag (optional, e.g., tech, docs, FAQ, case)
     * @param args.tags Tag array (optional, for finer-grained retrieval)
     * @param args.metadata Additional metadata (optional, key-value pairs)
     * @returns Newly created entry info, including generated id
     *
     * @example Return format:
     * ```json
     * { "id": "kb_001", "status": "created", "title": "My Knowledge" }
     * ```
     */
    knowledge_add(args: Record<string, unknown>): Promise<string>;

    /**
     * Delete specified entry from knowledge base
     * @param args Delete parameters
     * @param args.id Knowledge entry ID to delete (required)
     * @param args.force Force delete (default false, soft delete; true for physical delete)
     * @returns Delete result
     *
     * @example Return format:
     * ```json
     * { "status": "deleted", "id": "kb_001" }
     * ```
     */
    knowledge_delete(args: Record<string, unknown>): Promise<string>;

    /**
     * Search for relevant content in the knowledge base
     * @param args Search parameters
     * @param args.query Search keyword (required)
     * @param args.topK Number of results to return (default 5, max 50)
     * @param args.category Optional, filter by category
     * @param args.tags Optional, filter by tags
     * @param args.threshold Optional, relevance threshold (0-1)
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
    knowledge_search(args: Record<string, unknown>): Promise<string>;

    /**
     * Read the full content of a specified entry in the knowledge base
     * @param args Read parameters
     * @param args.id Knowledge entry ID to read (required)
     * @param args.includeMetadata Whether to include metadata (default false)
     * @returns Full entry content
     *
     * @example Return format:
     * ```json
     * {
     *   "id": "kb_001",
     *   "title": "API Documentation",
     *   "content": "# API...\n\n## Endpoint Description",
     *   "category": "tech",
     *   "tags": ["api", "rest"],
     *   "createdAt": "2024-01-01T00:00:00Z",
     *   "updatedAt": "2024-01-02T00:00:00Z"
     * }
     * ```
     */
    knowledge_read(args: Record<string, unknown>): Promise<string>;

}
