import 'dotenv/config';
import { Command } from 'commander';
import * as readline from 'readline';
import { loadDemoEnv, createDemoHost, type DemoHost } from './runtime';
import { promptInput, createReadlineInterface } from './cli-readline';

type CLIState = 'idle' | 'waiting-task' | 'processing' | 'waiting-user-input';

loadDemoEnv();

async function main() {
  const program = new Command();
  program.name('agent-brain-cli').description('AgentBrain demo: interactive CLI or one-shot run.');

  program
    .command('chat', { isDefault: true })
    .description('Interactive readline session (default)')
    .action(async () => {
      const { rl, prompt } = createReadlineInterface();
      const host = await createDemoHost({
        onCronLog: console.log,
        resolveScheduledJobAskUser: async (question) => prompt(`\n❓ ${question}\n> `),
      });
      try {
        await runInteractiveSession(host, rl, prompt);
      } finally {
        const rlClosed = (rl as unknown as { closed?: boolean }).closed;
        if (!rlClosed) rl.close();
        host.dispose();
      }
    });

  program
    .command('run')
    .argument('<task>', 'Single-line prompt (quote spaces: run "say hi")')
    .action(async (task: string) => {
      if (!task) {
        console.error('Missing task text after `run`.');
        process.exitCode = 1;
        return;
      }
      const host = await createDemoHost({
        onCronLog: console.log,
        resolveScheduledJobAskUser: async (question) => {
          const answer = await promptInput(`\n❓ ${question}\n> `);
          return answer;
        },
      });
      await runSingleTask(host, task, {
        onPhase(type, payload) {
          console.log(`\n[${type}]: ${JSON.stringify(payload)}`);
        },
        resolveUserInput: async (question) => promptInput(`\n❓ ${question}\n> `),
      });
      host.dispose();
    });

  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    process.argv.push('chat');
  }
  await program.parseAsync(process.argv);
}

async function runInteractiveSession(
  host: DemoHost,
  rl: readline.Interface,
  prompt: (text: string) => Promise<string>,
): Promise<void> {
  let isRunning = true;
  let state: CLIState = 'idle';
  console.log('\n' + '='.repeat(60));
  console.log('🧠 AgentBrain 交互式 CLI');
  console.log('='.repeat(60));
  console.log('输入您的请求，按 Enter 发送');
  console.log('输入 :exit 或按 Ctrl+C 退出\n');

  const resolveInteractiveAskUser = async (question: string): Promise<string> => {
    state = 'waiting-user-input';
    const answer = await prompt(`\n❓ ${question}\n> `);
    state = 'processing';
    return answer;
  };

  const runAgent = (userInput: string): void => {
    state = 'processing';
    host
      .createBrain({
        publish(type: string, payload: unknown) {
          if (['task:start', 'phase:perceive', 'phase:assess', 'phase:plan', 'phase:execute', 'phase:reflect'].includes(type)) {
            console.log(`\n[${type}]: ${JSON.stringify(payload)}`);
          }
        },
        resolveUserInput: resolveInteractiveAskUser,
      })
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
        void askTask();
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
        void askTask();
      });
  };

  const askTask = async (): Promise<void> => {
    if (!isRunning) return;
    if (state !== 'idle') return;

    state = 'waiting-task';
    const input = await prompt('请输入您的请求: ');

    if (!input.trim()) {
      state = 'idle';
      void askTask();
      return;
    }
    if (input.trim().toLowerCase() === ':exit') {
      console.log('\n👋 再见!');
      isRunning = false;
      host.dispose();
      rl.close();
      process.exit(0);
    }

    console.log(`\n🚀 开始处理: "${input}"\n`);
    runAgent(input);
  };

  process.on('SIGINT', () => {
    isRunning = false;
    host.dispose();
    console.log('\n\n👋 再见!');
    rl.close();
    process.exit(0);
  });

  rl.on('close', () => {
    isRunning = false;
  });

  await new Promise<void>((resolve) => {
    rl.once('close', () => resolve());
    void askTask();
  });
}

async function runSingleTask(
  host: DemoHost,
  userInput: string,
  hooks: {
    onPhase: (type: string, payload: unknown) => void;
    resolveUserInput: (question: string) => Promise<string>;
  },
): Promise<void> {
  const brain = host.createBrain({
    publish(type: string, payload: unknown) {
      if (['task:start', 'phase:perceive', 'phase:assess', 'phase:plan', 'phase:execute', 'phase:reflect'].includes(type)) {
        hooks.onPhase(type, payload);
      }
    },
    resolveUserInput: hooks.resolveUserInput,
  });

  console.log(`\n🚀 开始处理: "${userInput}"\n`);
  try {
    const result = await brain.run(userInput);
    console.log('\n' + '='.repeat(60));
    console.log(`📊 状态: ${result.status}`);
    console.log(`⏱️  耗时: ${result.durationMs}ms`);
    console.log(`🔢 Token: ${result.tokenUsage.totalTokens}`);
    console.log('='.repeat(60));
    console.log('\n📝 回答:\n');
    console.log(result.finalAnswer ?? '(无回答)');
    console.log();
  } catch (err) {
    console.error('❌ 执行出错:');
    console.log('\n' + '='.repeat(60));
    console.log('📊 状态: FAILED');
    console.log('='.repeat(60));
    console.log('\n📝 回答:\n');
    console.log(`Unrecoverable error: ${String(err)}`);
    console.log();
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
