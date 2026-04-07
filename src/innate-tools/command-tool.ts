import type { InnateTool, ToolDefinition } from './types';

const CMD_TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  cmd_exec: {
    name: 'cmd_exec',
    description: 'Execute a shell command and return its output. Use this to run system commands, scripts, or interact with command-line tools.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute (e.g., "ls -la", "npm run build", "git status")',
        },
        cwd: {
          type: 'string',
          description: 'Working directory for the command. If not specified, uses current directory.',
        },
        timeout: {
          type: 'number',
          description: 'Maximum time to wait for command completion in milliseconds (default: 60000)',
          default: 60000,
        },
        env: {
          type: 'object',
          description: 'Environment variables to set for the command',
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
  },

  cmd_run: {
    name: 'cmd_run',
    description: 'Run a Node.js script or module. Returns the output of the executed script.',
    parameters: {
      type: 'object',
      properties: {
        script: {
          type: 'string',
          description: 'JavaScript code to execute',
        },
        module: {
          type: 'string',
          description: 'Node.js module to run (e.g., "npm", "ts-node")',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Arguments to pass to the module',
        },
        cwd: {
          type: 'string',
          description: 'Working directory',
        },
        timeout: {
          type: 'number',
          description: 'Timeout in milliseconds (default: 60000)',
          default: 60000,
        },
      },
      additionalProperties: false,
    },
  },

  cmd_kill: {
    name: 'cmd_kill',
    description: 'Terminate a running process by its PID.',
    parameters: {
      type: 'object',
      properties: {
        pid: {
          type: 'number',
          description: 'Process ID to terminate',
        },
        force: {
          type: 'boolean',
          description: 'If true, uses SIGKILL instead of SIGTERM (default: false)',
          default: false,
        },
      },
      required: ['pid'],
      additionalProperties: false,
    },
  },

  cmd_bg: {
    name: 'cmd_bg',
    description: 'Start a background process. Returns the PID for later management.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to run in background',
        },
        cwd: {
          type: 'string',
          description: 'Working directory',
        },
        name: {
          type: 'string',
          description: 'Optional name to identify the process',
        },
        env: {
          type: 'object',
          description: 'Environment variables',
        },
      },
      required: ['command'],
      additionalProperties: false,
    },
  },

  cmd_list: {
    name: 'cmd_list',
    description: 'List running background processes started by this session.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
};

export { CMD_TOOL_DEFINITIONS };

const bgProcesses = new Map<number, { command: string; name?: string; startTime: Date; pid: number }>();

export class CmdExecTool implements InnateTool {
  readonly definition: ToolDefinition = CMD_TOOL_DEFINITIONS.cmd_exec;
  readonly actionCategory = 'cmd_exec' as const;
  readonly permissionTargetArgs = ['command'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const command = args['command'] as string;
    const cwd = args['cwd'] as string | undefined;
    const timeout = (args['timeout'] as number) || 60000;
    const env = args['env'] as Record<string, string> | undefined;

    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      const result = await execAsync(command, {
        cwd,
        env: { ...process.env, ...env },
        timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

      return JSON.stringify({
        status: 'ok',
        command,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
      });
    } catch (err: any) {
      return JSON.stringify({
        status: 'error',
        command,
        error: err.message,
        stdout: err.stdout || '',
        stderr: err.stderr || '',
        exitCode: err.code || 1,
      });
    }
  }
}

export class CmdRunTool implements InnateTool {
  readonly definition: ToolDefinition = CMD_TOOL_DEFINITIONS.cmd_run;
  readonly actionCategory = 'cmd_run' as const;
  readonly permissionTargetArgs = ['command'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const script = args['script'] as string | undefined;
    const module_ = args['module'] as string | undefined;
    const args_ = args['args'] as string[] | undefined;
    const cwd = args['cwd'] as string | undefined;
    const timeout = (args['timeout'] as number) || 60000;

    if (script) {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const nodeCmd = `node -e "${script.replace(/"/g, '\\"')}"`;

      try {
        const result = await execAsync(nodeCmd, { cwd, timeout });
        return JSON.stringify({ status: 'ok', stdout: result.stdout, stderr: result.stderr });
      } catch (err: any) {
        return JSON.stringify({ status: 'error', error: err.message, stderr: err.stderr });
      }
    }

    if (module_) {
      const { spawn } = await import('child_process');
      return new Promise((resolve) => {
        const proc = spawn(module_, args_ || [], { cwd, stdio: 'pipe' });
        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (d) => { stdout += d; });
        proc.stderr?.on('data', (d) => { stderr += d; });

        proc.on('close', (code) => {
          resolve(JSON.stringify({ status: 'ok', exitCode: code, stdout, stderr }));
        });

        proc.on('error', (err) => {
          resolve(JSON.stringify({ status: 'error', error: err.message }));
        });

        setTimeout(() => {
          proc.kill();
          resolve(JSON.stringify({ status: 'error', error: 'Timeout' }));
        }, timeout);
      });
    }

    return JSON.stringify({ status: 'error', message: 'Either script or module must be provided' });
  }
}

export class CmdKillTool implements InnateTool {
  readonly definition: ToolDefinition = CMD_TOOL_DEFINITIONS.cmd_kill;
  readonly actionCategory = 'cmd_kill' as const;
  readonly permissionTargetArgs = ['pid'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const pid = args['pid'] as number;
    const force = args['force'] as boolean || false;

    const signal = force ? 'SIGKILL' : 'SIGTERM';

    return new Promise((resolve) => {
      try {
        process.kill(pid, signal);
        resolve(JSON.stringify({ status: 'ok', pid, signal }));
      } catch (err: any) {
        resolve(JSON.stringify({ status: 'error', pid, error: err.message }));
      }
    });
  }
}

export class CmdBgTool implements InnateTool {
  readonly definition: ToolDefinition = CMD_TOOL_DEFINITIONS.cmd_bg;
  readonly actionCategory = 'cmd_bg' as const;
  readonly permissionTargetArgs = ['command'];

  async execute(args: Record<string, unknown>): Promise<string> {
    const command = args['command'] as string;
    const cwd = args['cwd'] as string | undefined;
    const name = args['name'] as string | undefined;
    const env = args['env'] as Record<string, string> | undefined;

    const { spawn } = await import('child_process');
    const proc = spawn(command, [], {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      detached: false,
    });

    const pid = proc.pid!;
    bgProcesses.set(pid, { command, name, startTime: new Date(), pid });

    let output = '';
    proc.stdout?.on('data', (d) => { output += d; });
    proc.stderr?.on('data', (d) => { output += d; });

    proc.on('exit', () => { bgProcesses.delete(pid); });
    proc.on('error', () => { bgProcesses.delete(pid); });

    return JSON.stringify({
      status: 'ok',
      pid,
      name: name || `process_${pid}`,
      command,
    });
  }
}

export class CmdListTool implements InnateTool {
  readonly definition: ToolDefinition = CMD_TOOL_DEFINITIONS.cmd_list;

  async execute(_args: Record<string, unknown>): Promise<string> {
    const processes = Array.from(bgProcesses.values()).map(p => ({
      pid: p.pid,
      name: p.name,
      command: p.command,
      startTime: p.startTime.toISOString(),
    }));

    return JSON.stringify({
      status: 'ok',
      count: processes.length,
      processes,
    });
  }
}
