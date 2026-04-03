// ============================================================
// 天生工具相关类型定义
// ============================================================

/**
 * 工具定义：描述一个工具的名称、用途和参数 JSON Schema。
 * 传给 LLM 的 function/tool calling 接口。
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * 天生工具：系统内建的基础能力（如搜索技能、安装技能、读文件等）。
 * 每个天生工具实现此接口后注册到 InnateToolHub。
 */
export interface InnateTool {
  /** 工具定义（名称、描述、JSON Schema 参数） */
  readonly definition: ToolDefinition;
  /** 执行工具 */
  execute(args: Record<string, unknown>): Promise<string>;
}
