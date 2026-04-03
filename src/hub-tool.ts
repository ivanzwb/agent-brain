import { InnateTool, ToolDefinition } from './innate-tools/types';
import { IHub } from './types';

export class HubTool implements InnateTool {
    definition: ToolDefinition;

    constructor(private hub: IHub, private toolName: string) {
        this.definition = this.hub.getToolDefinition(this.toolName)!;
    }

    execute(args: Record<string, unknown>): Promise<string> {
        if (!this.hub.hasTool(this.toolName)) {
            throw new Error(`Tool ${this.toolName} is not installed.`);
        }
        return (this.hub as any)[this.toolName]?.(args);
    }
}