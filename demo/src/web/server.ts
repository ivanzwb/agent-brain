import 'dotenv/config';
import path from 'path';
import express from 'express';
import { randomUUID } from 'crypto';
import { loadDemoEnv, createDemoHost, type DemoHost } from '../runtime';

loadDemoEnv();

type SsePayload =
  | { type: 'start'; message: string }
  | { type: 'phase'; phase: string; payload: unknown }
  | { type: 'input-request'; question: string }
  | {
      type: 'done';
      status: string;
      durationMs: number;
      totalTokens: number;
      finalAnswer?: string;
    }
  | { type: 'error'; message: string };

class WebRun {
  readonly id: string;
  private readonly chunks: SsePayload[] = [];
  private sse: express.Response | null = null;
  private inputResolve: ((value: string) => void) | null = null;
  private finished = false;

  constructor() {
    this.id = randomUUID();
  }

  attachSse(res: express.Response): void {
    this.sse = res;
    for (const c of this.chunks) {
      this.writeSse(c);
    }
  }

  emit(data: SsePayload): void {
    this.chunks.push(data);
    this.writeSse(data);
  }

  private writeSse(data: SsePayload): void {
    if (!this.sse || this.finished) return;
    this.sse.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  waitForUserInput(question: string): Promise<string> {
    this.emit({ type: 'input-request', question });
    return new Promise((resolve) => {
      this.inputResolve = resolve;
    });
  }

  provideInput(answer: string): { ok: true } | { ok: false; reason: string } {
    if (!this.inputResolve) {
      return { ok: false, reason: 'No pending question for this run.' };
    }
    const r = this.inputResolve;
    this.inputResolve = null;
    r(answer);
    return { ok: true };
  }

  end(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.sse) {
      this.sse.end();
      this.sse = null;
    }
  }
}

async function main() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(express.static(path.join(__dirname, '../../public')));

  const host: DemoHost = await createDemoHost({
    onCronLog: (line) => console.log(line),
    resolveScheduledJobAskUser: async (question) =>
      `[WEB_CRON] No operator connected for ask_user. Question was:\n${question}`,
  });

  const runs = new Map<string, WebRun>();
  app.get('/api/conversation/history', async (_req, res) => {
    try {
      const json = await host.memory.serializeConversationThread(200);
      res.type('application/json').send(json);
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  });

  app.post('/api/runs', (req, res) => {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      res.status(400).json({ error: 'Body must include non-empty string field "message".' });
      return;
    }
    const run = new WebRun();
    runs.set(run.id, run);
    run.emit({ type: 'start', message });

    void (async () => {
      try {
        const brain = host.createBrain({
          publish(type: string, payload: unknown) {
            if (['task:start', 'phase:perceive', 'phase:assess', 'phase:plan', 'phase:execute', 'phase:reflect'].includes(type)) {
              run.emit({ type: 'phase', phase: type, payload });
            }
          },
          resolveUserInput: (q) => run.waitForUserInput(q),
        });
        const result = await brain.run(message);
        run.emit({
          type: 'done',
          status: result.status,
          durationMs: result.durationMs,
          totalTokens: result.tokenUsage.totalTokens,
          finalAnswer: result.finalAnswer,
        });
      } catch (e) {
        run.emit({ type: 'error', message: String(e) });
      } finally {
        run.end();
        setTimeout(() => runs.delete(run.id), 60_000);
      }
    })();

    res.json({ runId: run.id });
  });

  app.get('/api/runs/:id/events', (req, res) => {
    const run = runs.get(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Unknown or finished runId.' });
      return;
    }
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    run.attachSse(res);
    req.on('close', () => {
      run.end();
    });
  });

  app.post('/api/runs/:id/input', (req, res) => {
    const run = runs.get(req.params.id);
    if (!run) {
      res.status(404).json({ error: 'Unknown or finished runId.' });
      return;
    }
    const text = typeof req.body?.text === 'string' ? req.body.text : '';
    const outcome = run.provideInput(text);
    if (!outcome.ok) {
      res.status(409).json({ error: outcome.reason });
      return;
    }
    res.json({ ok: true });
  });

  const port = Number(process.env.PORT ?? '3847');
  app.listen(port, () => {
    console.log(`AgentBrain web demo: http://127.0.0.1:${port}`);
  });

  process.on('SIGINT', () => {
    host.dispose();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
