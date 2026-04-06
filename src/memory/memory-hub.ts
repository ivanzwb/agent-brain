import { IHub } from '../types';

/**
 * MemoryHub — 记忆管理统一接口
 * 
 * 提供两类能力：
 * 1. 短期记忆：对话消息跟踪、搜索、压缩
 * 2. 长期记忆：语义搜索、保存、列出、删除
 */
export interface MemoryHub extends IHub {

    // ==================== 短期记忆 (会话) ====================

    /**
     * 跟踪对话消息，存入短期记忆
     * @param conversationId 会话ID（用于标记同一对话，便于后续压缩）
     * @param role 消息角色：'user' | 'assistant' | 'system'
     * @param content 消息内容
     */
    conversation_track(conversationId: string, role: string, content: string): Promise<void>;

    /**
     * 搜索短期记忆（当前会话历史）
     * @param args 搜索参数
     * @param args.query 搜索文本（必填）
     * @param args.limit 返回数量（默认 10）
     * @returns 匹配的会话消息列表
     * 
     * @example 返回格式:
     * ```json
     * {
     *   "results": [
     *     { "role": "user", "content": "关于API的问题", "timestamp": "2024-01-01T10:00:00Z" },
     *     { "role": "assistant", "content": "以下是API文档...", "timestamp": "2024-01-01T10:01:00Z" }
     *   ]
     * }
     * ```
     */
    conversation_search(args: Record<string, unknown>): Promise<string>;

    /**
     * 压缩会话历史，保留关键信息
     * @param args 压缩参数
     * @param args.keepLast 保留最近N条消息（默认 10）
     * @param args.extractKeyPoints 是否提取关键点（默认 true）
     * @returns 压缩结果
     * 
     * @example 返回格式:
     * ```json
     * { "status": "compressed", "keptCount": 10, "summary": "讨论了API认证流程，用户了解了OAuth2的工作原理" }
     * ```
     */
    conversation_compress(args: Record<string, unknown>): Promise<string>;

    // ==================== 长期记忆 ====================

    /**
     * 语义搜索长期记忆
     * @param args 搜索参数
     * @param args.query 搜索文本（必填）
     * @param args.topK 返回数量（默认 5，最大 50）
     * @param args.category 可选，按分类筛选
     * @returns 搜索结果列表
     * 
     * @example 返回格式:
     * ```json
     * {
     *   "results": [
     *     { "id": "mem_001", "category": "preference", "key": "user_name", "value": "张三", "score": 0.95 }
     *   ]
     * }
     * ```
     */
    memory_search(args: Record<string, unknown>): Promise<string>;

    /**
     * 保存事实、偏好或经历到长期记忆
     * @param args 保存参数
     * @param args.key 记忆标识符（必填）
     * @param args.value 记忆内容（必填）
     * @param args.category 分类：preference | fact | episodic | procedural
     * @returns 保存结果
     * 
     * @example 返回格式:
     * ```json
     * { "id": "mem_001", "status": "saved", "key": "user_name" }
     * ```
     */
    memory_save(args: Record<string, unknown>): Promise<string>;

    /**
     * 列出当前活跃的记忆条目
     * @param args 列表参数
     * @param args.category 可选，按分类筛选
     * @param args.limit 返回数量（默认 20，最大 100）
     * @returns 记忆条目列表
     * 
     * @example 返回格式:
     * ```json
     * {
     *   "items": [
     *     { "id": "mem_001", "category": "preference", "key": "user_name", "value": "张三", "createdAt": "2024-01-01T00:00:00Z" }
     *   ]
     * }
     * ```
     */
    memory_list(args: Record<string, unknown>): Promise<string>;

    /**
     * 软删除记忆条目（标记删除，可恢复）
     * @param args 删除参数
     * @param args.id 要删除的记忆 ID（必填）
     * @returns 删除结果
     * 
     * @example 返回格式:
     * ```json
     * { "status": "deleted", "id": "mem_001" }
     * ```
     */
    memory_delete(args: Record<string, unknown>): Promise<string>;

    /**
     * 获取最近的对话历史
     * @param args 参数
     * @param args.limit 返回消息数量（默认 20，最大 200）
     * @returns 对话历史列表
     * 
     * @example 返回格式:
     * ```json
     * {
     *   "messages": [
     *     { "role": "user", "content": "你好", "timestamp": "2024-01-01T10:00:00Z" },
     *     { "role": "assistant", "content": "你好", "timestamp": "2024-01-01T10:00:01Z" }
     *   ]
     * }
     * ```
     */
    memory_get_history(args: Record<string, unknown>): Promise<string>;

}