import path from 'path';
import dotenv from 'dotenv';
import { createMemory, type EmbeddingProvider } from '@biosbot/agent-memory';
import { OpenAI } from 'openai';
import { SkillFramework } from '@biosbot/agent-skills';
import { AgentBrain, type CronHub, ExecutionMode } from '../../src';
import type { IEventPublisher } from '../../src/types';
import { OpenAIClient } from '../../src/model/openai-client';
import { CronHubAdapter, type CronScheduledJobSnapshot } from './cron-hub-adapter';
import { SkillHubAdapter } from './skill-hub-adapter';
import { MemoryHubAdapter } from './memory-hub-adapter';

export function loadDemoEnv(): void {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

/**
 * Builds the user message passed to `AgentBrain.run` with `{ fastPath: true }` for cron triggers.
 * Encourages self-contained runs: frozen `resolvedResources` + task `command`.
 */
export function formatCronJobUserInput(job: CronScheduledJobSnapshot): string {
  const header = `[Scheduled job: ${job.name}] [jobId=${job.id}]`;
  const res =
    job.resolvedResources && Object.keys(job.resolvedResources).length > 0
      ? `\n[Resolved resources — do not ask the user to re-supply these]\n${JSON.stringify(job.resolvedResources, null, 2)}\n`
      : '\n';
  return `${header}${res}\n[Task]\n${job.command}`;
}

function createEmbeddingProvider(): EmbeddingProvider {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });
  return {
    dimensions: 1536,
    async embed(text: string): Promise<number[]> {
      const resp = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL ?? 'nomic-embed-text',
        input: text,
      });
      return resp.data[0].embedding;
    },
  };
}

/** Per-brain hooks: outer logging + how to answer innate `ask_user`. */
export type BrainHooks = {
  publish: IEventPublisher['publish'];
  resolveUserInput: (question: string) => Promise<string>;
};

export type DemoHost = {
  model: OpenAIClient;
  memory: MemoryHubAdapter;
  skills: SkillHubAdapter;
  cron: CronHubAdapter;
  createBrain: (hooks: BrainHooks) => AgentBrain;
  dispose: () => void;
};

export type DemoHostOptions = {
  onCronLog: (line: string) => void;
  /** `ask_user` during scheduled cron runs (no interactive session). */
  resolveScheduledJobAskUser: (question: string) => Promise<string>;
};

export async function createDemoHost(opts: DemoHostOptions): Promise<DemoHost> {
  const mem = await createMemory({
    dataDir: process.env.MEMORY_DATA_DIR,
    embedding: createEmbeddingProvider(),
  });
  const memory = new MemoryHubAdapter(mem);
  const sf = SkillFramework.init(process.env.SKILLS_DIR ?? './skills');
  const skills = new SkillHubAdapter(sf);
  const model = new OpenAIClient({
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    temperature: 0.4,
    contextWindow: 128000,
    timeoutMs: 600000,
  });

  let cron!: CronHubAdapter;

  const createBrain = (hooks: BrainHooks): AgentBrain => {
    let self: AgentBrain | null = null;
    const brain = new AgentBrain({
      model,
      memory,
      skills,
      cron,
      config: {
        systemPrompt: 'You are a helpful AI assistant. Answer clearly and concisely.',
        maxSteps: 50,
        maxReplans: 5,
        workingDirectory: process.env.SANDBOX_DIR,
      },
      eventPublisher: {
        publish(type: string, payload: unknown) {
          if (type === 'user:input-request') {
            const { question } = payload as { question: string };
            void hooks.resolveUserInput(question).then((answer) => {
              self?.provideUserInput(answer);
            });
          }
          hooks.publish(type, payload);
        },
      },
    });
    self = brain;
    return brain;
  };

  cron = new CronHubAdapter({
    onJobTrigger: async (job) => {
      const payload = formatCronJobUserInput(job);
      opts.onCronLog(`\n[cron] ▶ ${job.name} (${job.id}) → fast path`);
      const brain = createBrain({
        publish(type: string, payload: unknown) {
          if (['task:start', 'phase:perceive', 'phase:assess', 'phase:plan', 'phase:execute', 'phase:reflect'].includes(type)) {
            opts.onCronLog(`\n[${type}]: ${JSON.stringify(payload)}`);
          }
        },
        resolveUserInput: opts.resolveScheduledJobAskUser,
      });
      try {
        const result = await brain.run(payload, { mode: ExecutionMode.EXECUTE });
        opts.onCronLog(`[cron] ✓ ${job.name} status=${result.status}`);
        if (result.finalAnswer) {
          opts.onCronLog(
            `[cron] answer (truncated): ${result.finalAnswer.slice(0, 500)}${result.finalAnswer.length > 500 ? '…' : ''}`,
          );
        }
      } catch (e) {
        opts.onCronLog(`[cron] ✗ ${job.name}: ${String(e)}`);
      }
    },
  });

  return {
    model,
    memory,
    skills,
    cron,
    createBrain,
    dispose: () => {
      cron.dispose();
    },
  };
}

export type { CronScheduledJobSnapshot };
export type { CronHub };
