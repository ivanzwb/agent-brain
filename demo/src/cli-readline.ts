import * as readline from 'readline';

export function createReadlineInterface(): {
  rl: readline.Interface;
  prompt: (promptText: string) => Promise<string>;
} {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let isRunning = true;

  const prompt = (promptText: string): Promise<string> =>
    new Promise((resolve) => {
      if (!isRunning || (rl as { closed?: boolean }).closed) {
        resolve('');
        return;
      }
      rl.question(promptText, (answer) => {
        resolve(answer);
      });
    });

  rl.on('close', () => {
    isRunning = false;
  });

  return { rl, prompt };
}

/** stdin readline without storing global rl (for one-shot `run` command). */
export function promptInput(promptText: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
