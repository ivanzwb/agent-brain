import { createMemory } from '@biosbot/agent-memory';
import { SkillFramework } from '@biosbot/agent-skills';
import { AgentBrain } from '../../src/agent-brain';
import { OpenAIClient } from '../../src/model/openai-client';
import { MemoryHubAdapter } from './memory-hub-adapter';
import { SkillHubAdapter } from './skill-hub-adapter';

// ============================================================
// Demo — 使用 agent-memory + agent-skills 集成 AgentBrain
//
// 用法：
//   OPENAI_API_KEY=sk-xxx npx ts-node demo/index.ts "你的问题"
//
// 可选环境变量：
//   OPENAI_BASE_URL  — API 端点（默认 https://api.openai.com/v1）
//   OPENAI_MODEL     — 模型名（默认 gpt-4o）
//   MEMORY_DATA_DIR  — agent-memory 数据目录（默认 ./demo-data）
//   SKILLS_DIR       — agent-skills 技能存储目录（默认 ./demo-skills）
// ============================================================


async function main() {
  const userInput = process.argv[2];
  if (!userInput) {
    console.error('Usage: npx ts-node demo/index.ts "Your question here"');
    process.exit(1);
  }

  // ---- 1. 初始化 agent-memory ----
  const agentMemory = await createMemory({
    dataDir: process.env.MEMORY_DATA_DIR ?? './memory-data',
  });

  // ---- 2. 初始化 agent-skills ----
  const sf = SkillFramework.init(process.env.SKILLS_DIR ?? './skills');

  // ---- 3. 构建适配器和组件 ----
  const memory = new MemoryHubAdapter(agentMemory);
  const skills = new SkillHubAdapter(sf);
  const model = new OpenAIClient({
    baseURL: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o',
    temperature: 0.7,
  });

  // ---- 4. 创建 AgentBrain ----
  const brain = new AgentBrain({
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
        console.log(`[${type}]`, JSON.stringify(payload, null, 2).slice(0, 200));
      },
    },
  });

  // ---- 5. 运行任务 ----
  console.log(`\n🧠 AgentBrain 开始处理: "${userInput}"\n`);
  const result = await brain.run(userInput);

  // ---- 6. 输出结果 ----
  console.log('\n' + '='.repeat(60));
  console.log(`状态: ${result.status}`);
  console.log(`终止原因: ${result.terminationReason}`);
  console.log(`耗时: ${result.durationMs}ms`);
  console.log(`Token 使用: ${JSON.stringify(result.tokenUsage)}`);
  console.log(`步骤数: ${result.steps.length}`);
  console.log('='.repeat(60));
  console.log('\n最终回答:\n');
  console.log(result.finalAnswer ?? '(无回答)');

  // ---- 7. 清理 ----
  await agentMemory.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
