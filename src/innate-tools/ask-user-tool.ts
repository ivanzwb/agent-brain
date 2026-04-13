import type { InnateTool, ToolDefinition } from './types';
import { InnateToolHub } from './innate-tool-hub';

/** Tool schema on `definition`; when to use: `fragments/ask-user-business.md`. */
export class AskUserTool implements InnateTool {
  readonly definition: ToolDefinition = {
    name: 'ask_user',
    description: 'Ask the user a question and wait for their response. Use this when you need more information from the user to proceed. The user\'s response will be provided as the observation.',
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The question to ask the user. Be clear about what information you need.',
        },
      },
      required: ['question'],
    },
  };

  constructor(private hub: InnateToolHub) {}

  async execute(args: Record<string, unknown>): Promise<string> {
    const question = args['question'] as string;
    if (!question) {
      return '[Error] Missing required parameter: question';
    }
    const userInput = await this.hub.requestUserInput(question);
    return userInput;
  }
}
