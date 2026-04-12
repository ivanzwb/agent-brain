import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import type {
  IModelClient,
  Message,
  ModelResponse,
  ToolCallIntent,
  ToolDefinition,
} from '../types';

// ============================================================
// OpenAI Compatible API Client (based on official openai SDK)
//
// Supports all OpenAI Chat Completions compatible endpoints:
//   - OpenAI API
//   - Azure OpenAI
//   - Local models (Ollama, vLLM, LocalAI, etc.)
// ============================================================

export interface OpenAIClientOptions {
  /** API endpoint, default https://api.openai.com/v1 */
  baseURL?: string;
  /** API key. Can be empty for local models */
  apiKey?: string;
  /** Model name, e.g., gpt-4o, gpt-4o-mini */
  model: string;
  /** Temperature parameter, default 0.7 */
  temperature?: number;
  /** Request timeout in milliseconds, default 60000 */
  timeoutMs?: number;
  /** Model context window size in tokens (defaults to 128k if omitted) */
  contextWindow?: number;
}

export class OpenAIClient implements IModelClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly contextWindowSize: number;

  constructor(opts: OpenAIClientOptions) {
    this.client = new OpenAI({
      baseURL: opts.baseURL,
      apiKey: opts.apiKey ?? '',
      timeout: opts.timeoutMs === undefined ? 0 : (opts.timeoutMs ?? 60_000),
    });
    this.model = opts.model;
    this.temperature = opts.temperature ?? 0.7;
    // Default to 128k tokens if not specified explicitly
    this.contextWindowSize = opts.contextWindow ?? 128_000;
  }

  // ----- ITokenCounter -----

  /** Approximate token counting (1 token ≈ 4 characters), can be overridden with tiktoken in production */
  count(text: string): number {
    return Math.ceil(text.length / 4);
  }

  countTools(tools: ToolDefinition[]): number {
    return this.count(JSON.stringify(tools));
  }

  // ----- IModelClient -----

  get contextWindow(): number {
    return this.contextWindowSize;
  }

  async chat(messages: Message[], tools?: ToolDefinition[]): Promise<ModelResponse> {
    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: messages.map(m => this.toSDKMessage(m)),
      temperature: this.temperature,
    };

    if (tools && tools.length > 0) {
      params.tools = tools.map(t => this.toSDKTool(t));
      params.tool_choice = 'auto';
    }

    const completion = await this.client.chat.completions.create(params);
    return this.parseCompletion(completion);
  }

  // ----- Format Conversion -----

  private toSDKMessage(msg: Message): ChatCompletionMessageParam {
    if (msg.role === 'assistant' && msg.toolCall) {
      return {
        role: 'assistant',
        content: msg.content || null,
        tool_calls: [
          {
            id: msg.toolCall.id ?? `call_${Date.now()}`,
            type: 'function',
            function: {
              name: msg.toolCall.name,
              arguments: JSON.stringify(msg.toolCall.arguments),
            },
          },
        ],
      };
    }

    if (msg.role === 'tool') {
      return {
        role: 'tool',
        content: msg.content,
        tool_call_id: msg.toolCallId ?? '',
      };
    }

    return {
      role: msg.role as 'system' | 'user',
      content: msg.content,
    };
  }

  private toSDKTool(def: ToolDefinition): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: def.name,
        description: def.description,
        parameters: def.parameters,
      },
    };
  }

  private parseCompletion(completion: OpenAI.ChatCompletion): ModelResponse {
    const choice = completion.choices?.[0];
    if (!choice) {
      throw new Error('OpenAI API returned empty choices');
    }

    const msg = choice.message;
    const content = msg.content ?? '';

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      const tc = msg.tool_calls[0];
      if (tc.type !== 'function') {
        return { content };
      }
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        args = {};
      }
      const toolCall: ToolCallIntent = {
        id: tc.id,
        name: tc.function.name,
        arguments: args,
      };
      return { content, toolCall };
    }

    return { content };
  }
}
