import type {
  InnateTool,
  ToolDefinition,
} from './types';
import type { IHub, IEventPublisher } from '../types';
import type { ActionCategory } from '../sandbox/security-sandbox';

export class InnateToolHub implements IHub {

  private readonly registry = new Map<string, InnateTool>();
  private _userInputResolver?: (input: string) => void;
  private _userInputPromise?: Promise<string>;
  private _eventPublisher?: IEventPublisher;
  private _userProvidedContext: string[] = [];

  setEventPublisher(publisher: IEventPublisher): void {
    this._eventPublisher = publisher;
  }

  getUserProvidedContext(): string[] {
    return this._userProvidedContext;
  }

  requestUserInput(question: string): Promise<string> {
    if (!this._userInputPromise) {
      this._userInputPromise = new Promise((resolve) => {
        this._userInputResolver = resolve;
      });
    }
    this._eventPublisher?.publish('user:input-request', { question });
    return this._userInputPromise;
  }

  provideUserInput(input: string): void {
    this._userProvidedContext.push(input);
    if (this._userInputResolver) {
      this._userInputResolver(input);
      this._userInputResolver = undefined;
      this._userInputPromise = undefined;
    }
  }

  register(tool: InnateTool): this {
    const toolName = tool.definition.name;
    if (this.registry.has(toolName)) {
      throw new Error(`Innate tool "${toolName}" is already registered`);
    }
    this.registry.set(toolName, tool);
    return this;
  }

  registerAll(tools: InnateTool[]): this {
    for (const tool of tools) {
      this.register(tool);
    }
    return this;
  }

  unregister(toolName: string): boolean {
    return this.registry.delete(toolName);
  }

  getToolDefinition(toolName: string): ToolDefinition | undefined {
    return this.registry.get(toolName)?.definition;
  }

  hasTool(toolName: string): boolean {
    return this.registry.has(toolName);
  }
  getToolsDescription(): string[] {
    return Array.from(this.registry.values()).map(t => `${t.definition.name}: ${t.definition.description}`);
  }

  getTools(): ToolDefinition[] {
    return Array.from(this.registry.values()).map(t => t.definition);
  }

  /** Get the sandbox action category for a tool. Returns undefined if the tool is exempt. */
  getActionCategory(toolName: string): ActionCategory | undefined {
    return this.registry.get(toolName)?.actionCategory;
  }

  /** Extract the permission target from tool args based on the tool's declared permissionTargetArgs. */
  getPermissionTarget(toolName: string, args: Record<string, unknown>): string {
    const tool = this.registry.get(toolName);
    if (!tool?.permissionTargetArgs) return '*';
    for (const key of tool.permissionTargetArgs) {
      const val = args[key];
      if (typeof val === 'string' && val) return val;
      if (typeof val === 'number') return String(val);
    }
    return '*';
  }

  async execute(toolName: string, args: Record<string, unknown>): Promise<string> {
    const tool = this.registry.get(toolName);
    if (!tool) {
      throw new Error(`Unknown innate tool: ${toolName}`);
    }
    return tool.execute(args);
  }
}
