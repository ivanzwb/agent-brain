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
// OpenAI 兼容 API 客户端（基于官方 openai SDK）
//
// 支持所有 OpenAI Chat Completions 兼容的服务端点：
//   - OpenAI API
//   - Azure OpenAI
//   - 本地模型（Ollama、vLLM、LocalAI 等）
// ============================================================

export interface OpenAIClientOptions {
  /** API 端点，默认 https://api.openai.com/v1 */
  baseURL?: string;
  /** API 密钥。本地模型可留空 */
  apiKey?: string;
  /** 模型名称，如 gpt-4o、gpt-4o-mini */
  model: string;
  /** 温度参数，默认 0.7 */
  temperature?: number;
  /** 请求超时（毫秒），默认 60000 */
  timeoutMs?: number;
}

export class OpenAIClient implements IModelClient {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly temperature: number;

  constructor(opts: OpenAIClientOptions) {
    this.client = new OpenAI({
      baseURL: opts.baseURL,
      apiKey: opts.apiKey ?? '',
      timeout: opts.timeoutMs ?? 60_000,
    });
    this.model = opts.model;
    this.temperature = opts.temperature ?? 0.7;
  }

  // ----- ITokenCounter -----

  /** 近似 token 计数（1 token ≈ 4 字符），生产环境可覆写为 tiktoken */
  count(text: string): number {
    return Math.ceil(text.length / 4);
  }

  countTools(tools: ToolDefinition[]): number {
    return this.count(JSON.stringify(tools));
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

  // ----- 格式转换 -----

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
