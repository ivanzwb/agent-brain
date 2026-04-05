import { SkillFramework } from '@biosbot/agent-skills';
import { AgentBrain } from '../../src/agent-brain';
import { OpenAIClient } from '../../src/model/openai-client';
import { SkillHubAdapter } from './skill-hub-adapter';
import { MockMemoryHubAdapter } from './mock-memory-hub-adapter';
import * as readline from 'readline';


process.env.MEMORY_DATA_DIR = process.env.MEMORY_DATA_DIR ?? './memory-data';
process.env.SKILLS_DIR = process.env.SKILLS_DIR ?? './skills';

type CLIState = 'idle' | 'waiting-task' | 'processing' | 'waiting-user-input';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let isRunning = true;
let state: CLIState = 'idle';
let currentBrain: AgentBrain | null = null;

const memory = new MockMemoryHubAdapter();
const sf = SkillFramework.init(process.env.SKILLS_DIR ?? './skills');
const skills = new SkillHubAdapter(sf);
const model = new OpenAIClient({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL ?? 'gpt-4o',
  temperature: 0.1,
});

console.log('\n' + '='.repeat(60));
console.log('🧠 AgentBrain 交互式 CLI');
console.log('='.repeat(60));
console.log('输入您的请求，按 Enter 发送');
console.log('输入 :exit 或按 Ctrl+C 退出\n');

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

function runAgent(userInput: string): void {
  state = 'processing';
  
  currentBrain = new AgentBrain({
    model,
    memory,
    skills,
    config: {
      systemPrompt: 'You are a helpful AI assistant. Answer clearly and concisely.',
      modelContextSize: 128_000,
      maxSteps: 15,
      maxReplans: 2,
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
          console.log(`\n[${type}]`);
        }
      },
    },
  });

  currentBrain.run(userInput)
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
      console.error('❌ 执行出错:', String(err));
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
    rl.close();
    process.exit(0);
    return;
  }
  
  console.log(`\n🚀 开始处理: "${input}"\n`);
  runAgent(input);
}

process.on('SIGINT', () => {
  isRunning = false;
  console.log('\n\n👋 再见!');
  rl.close();
  process.exit(0);
});

rl.on('close', () => {
  isRunning = false;
});

askTask();
