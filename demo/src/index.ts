import { createMemory, type EmbeddingProvider } from '@biosbot/agent-memory';
import { OpenAI } from 'openai';
import { SkillFramework } from '@biosbot/agent-skills';
import { AgentBrain, type CronHub } from '../../src';
import { formatCronJobUserInput } from './format-cron-job-input';
import { OpenAIClient } from '../../src/model/openai-client';
import { CronHubAdapter } from './cron-hub-adapter';
import { SkillHubAdapter } from './skill-hub-adapter';
import { MemoryHubAdapter } from './memory-hub-adapter';
import * as readline from 'readline';

process.env.OPENAI_API_KEY = 'sk-f1450f3f4f804d0487851efa26009094';
process.env.OPENAI_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
process.env.OPENAI_MODEL = 'qwen-plus-0112';
process.env.SANDBOX_DIR = process.env.SANDBOX_DIR ?? './sandbox-data';
process.env.MEMORY_DATA_DIR = process.env.MEMORY_DATA_DIR ?? './memory-data';
process.env.SKILLS_DIR = process.env.SKILLS_DIR ?? './skills';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const embeddingProvider: EmbeddingProvider = {
  dimensions: 1536,
  async embed(text: string): Promise<number[]> {
    const resp = await openai.embeddings.create({
      model: 'text-embedding-v1',
      input: text,
    });
    return resp.data[0].embedding;
  },
};

type CLIState = 'idle' | 'waiting-task' | 'processing' | 'waiting-user-input';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let isRunning = true;
let state: CLIState = 'idle';
let currentBrain: AgentBrain | null = null;
let model: OpenAIClient;
let memory: MemoryHubAdapter;
let skills: SkillHubAdapter;
let cron!: CronHubAdapter;

function promptInput(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    if (!isRunning || (rl as any).closed) {
      resolve('');
      return;
    }
    rl.question(promptText, (answer) => {
      resolve(answer);
    });
  });
}

async function handleUserInput(question: string): Promise<string> {
  state = 'waiting-user-input';
  const answer = await promptInput(`\n❓ ${question}\n> `);
  state = 'processing';
  return answer;
}

function createAgentBrain(cronHub: CronHub): AgentBrain {
  return new AgentBrain({
    model,
    memory,
    skills,
    cron: cronHub,
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
          if (state === 'waiting-user-input') return;
          handleUserInput(question).then((answer) => {
            currentBrain?.provideUserInput(answer);
          });
        }
        if (['task:start', 'phase:perceive', 'phase:assess', 'phase:plan', 'phase:execute', 'phase:reflect'].includes(type)) {
          console.log(`\n[${type}]: ${JSON.stringify(payload)}`);
        }
      },
    },
  });
}

function runAgent(userInput: string): void {
  state = 'processing';

  currentBrain = createAgentBrain(cron);

  currentBrain
    .run(userInput)
    .then((result) => {
      console.log('\n' + '='.repeat(60));
      console.log(`📊 状态: ${result.status}`);
      console.log(`⏱️  耗时: ${result.durationMs}ms`);
      console.log(`🔢 Token: ${result.tokenUsage.totalTokens}`);
      console.log('='.repeat(60));
      console.log('\n📝 回答:\n');
      console.log(result.finalAnswer ?? '(无回答)');
      console.log();
      state = 'idle';
      askTask();
    })
    .catch((err) => {
      console.error('❌ 执行出错:');
      console.log('\n' + '='.repeat(60));
      console.log('📊 状态: FAILED');
      console.log('='.repeat(60));
      console.log('\n📝 回答:\n');
      console.log(`Unrecoverable error: ${String(err)}`);
      console.log();
      state = 'idle';
      askTask();
    });
}

async function askTask() {
  if (!isRunning) return;
  if (state !== 'idle') return;

  state = 'waiting-task';
  const input = await promptInput('请输入您的请求: ');

  if (!input.trim()) {
    state = 'idle';
    askTask();
    return;
  }
  if (input.trim().toLowerCase() === ':exit') {
    console.log('\n👋 再见!');
    isRunning = false;
    cron.dispose();
    rl.close();
    process.exit(0);
  }

  console.log(`\n🚀 开始处理: "${input}"\n`);
  runAgent(input);
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧠 AgentBrain 交互式 CLI');
  console.log('='.repeat(60));
  console.log('输入您的请求，按 Enter 发送');
  console.log('输入 :exit 或按 Ctrl+C 退出\n');

  const mem = await createMemory({
    dataDir: process.env.MEMORY_DATA_DIR,
    embedding: embeddingProvider,
  });
  memory = new MemoryHubAdapter(mem);
  const sf = SkillFramework.init(process.env.SKILLS_DIR ?? './skills');
  skills = new SkillHubAdapter(sf);
  model = new OpenAIClient({
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    temperature: 0.1,
  });

  cron = new CronHubAdapter({
    onJobTrigger: async (job) => {
      const payload = formatCronJobUserInput(job);
      const conversationId = `cron_${job.id}_${Date.now().toString(36)}`;
      console.log(`\n[cron] ▶ ${job.name} (${job.id}) → fast path`);
      const brain = createAgentBrain(cron);
      try {
        const result = await brain.run(payload, { conversationId, fastPath: true });
        console.log(`[cron] ✓ ${job.name} status=${result.status}`);
        if (result.finalAnswer) {
          console.log(`[cron] answer (truncated): ${result.finalAnswer.slice(0, 500)}${result.finalAnswer.length > 500 ? '…' : ''}`);
        }
      } catch (e) {
        console.error(`[cron] ✗ ${job.name}:`, e);
      }
    },
  });

  process.on('SIGINT', () => {
    isRunning = false;
    cron.dispose();
    console.log('\n\n👋 再见!');
    rl.close();
    process.exit(0);
  });

  rl.on('close', () => {
    isRunning = false;
  });

  askTask();
}

main().catch(console.error);
