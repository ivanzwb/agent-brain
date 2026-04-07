// ============================================================
// Innate Tool Type Definitions
// ============================================================

/**
 * Tool definition: describes a tool's name, purpose, and JSON Schema parameters.
 * Passed to LLM's function/tool calling interface.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * Innate tool: system-built-in basic capabilities (e.g., search skills, install skills, read files).
 * Each innate tool implements this interface and registers with InnateToolHub.
 */
export interface InnateTool {
  /** Tool definition (name, description, JSON Schema parameters) */
  readonly definition: ToolDefinition;
  /** Execute the tool */
  execute(args: Record<string, unknown>): Promise<string>;
}
