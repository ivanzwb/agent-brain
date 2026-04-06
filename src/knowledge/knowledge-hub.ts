import { IHub } from '../types';

/**
 * KnowledgeHub — 知识库管理接口
 * 
 * 提供结构化知识的 CRUD 操作，用于存储和检索可复用的信息文档
 */
export interface KnowledgeHub extends IHub {

    /**
     * 列出知识库中的所有条目
     * @param args 查询参数
     * @param args.category 可选，按分类筛选（如：技术、文档、FAQ、案例）
     * @param args.limit 返回数量限制，默认 20，最大 100
     * @param args.offset 起始偏移量，默认 0
     * @returns 条目列表，每条包含 id, title, category, createdAt 等信息
     * 
     * @example 返回格式:
     * ```json
     * {
     *   "items": [
     *     { "id": "kb_001", "title": "API文档", "category": "技术", "createdAt": "2024-01-01T00:00:00Z" }
     *   ],
     *   "total": 10,
     *   "hasMore": false
     * }
     * ```
     */
    knowledge_list(args: Record<string, unknown>): Promise<string>;

    /**
     * 添加新知识到知识库
     * @param args 知识条目内容
     * @param args.title 知识标题（必填）
     * @param args.content 知识内容（必填，Markdown 格式）
     * @param args.category 分类标签（可选，如：技术、文档、FAQ、案例）
     * @param args.tags 标签数组（可选，用于更细粒度检索）
     * @param args.metadata 额外元数据（可选，键值对）
     * @returns 新创建的条目信息，包含生成的 id
     * 
     * @example 返回格式:
     * ```json
     * { "id": "kb_001", "status": "created", "title": "我的知识" }
     * ```
     */
    knowledge_add(args: Record<string, unknown>): Promise<string>;

    /**
     * 从知识库删除指定条目
     * @param args 删除参数
     * @param args.id 要删除的知识条目 ID（必填）
     * @param args.force 是否强制删除（默认 false，标记删除；true 为物理删除）
     * @returns 删除结果
     * 
     * @example 返回格式:
     * ```json
     * { "status": "deleted", "id": "kb_001" }
     * ```
     */
    knowledge_delete(args: Record<string, unknown>): Promise<string>;

    /**
     * 搜索知识库中的相关内容
     * @param args 搜索参数
     * @param args.query 搜索关键词（必填）
     * @param args.topK 返回结果数量（默认 5，最大 50）
     * @param args.category 可选，按分类筛选
     * @param args.tags 可选，按标签筛选
     * @param args.threshold 可选，相关性阈值（0-1）
     * @returns 搜索结果列表，每条包含 id, title, content, score
     * 
     * @example 返回格式:
     * ```json
     * {
     *   "results": [
     *     { "id": "kb_001", "title": "相关文档", "content": "...", "score": 0.95 }
     *   ]
     * }
     * ```
     */
    knowledge_search(args: Record<string, unknown>): Promise<string>;

    /**
     * 读取知识库中指定条目的完整内容
     * @param args 读取参数
     * @param args.id 要读取的知识条目 ID（必填）
     * @param args.includeMetadata 是否包含元数据（默认 false）
     * @returns 条目完整内容
     * 
     * @example 返回格式:
     * ```json
     * {
     *   "id": "kb_001",
     *   "title": "API文档",
     *   "content": "# API...\n\n## 接口说明",
     *   "category": "技术",
     *   "tags": ["api", "rest"],
     *   "createdAt": "2024-01-01T00:00:00Z",
     *   "updatedAt": "2024-01-02T00:00:00Z"
     * }
     * ```
     */
    knowledge_read(args: Record<string, unknown>): Promise<string>;

}
