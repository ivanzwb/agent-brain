import * as os from 'os';
import * as path from 'path';
import {
  PermissionRequest,
  SecuritySandbox,
} from '../../src/sandbox/security-sandbox';
import { InnateToolHub } from '../../src/innate-tools/innate-tool-hub';

describe('SecuritySandbox', () => {
  const tmpRoot = path.join(os.tmpdir(), 'agent-brain-ut-sandbox');
  const mockHub = new InnateToolHub();

  it('prepareToolExecution injects cwd for cmd_* when allowed', async () => {
    const sb = new SecuritySandbox(mockHub, tmpRoot);
    sb.addRule({ action: 'cmd_exec', pattern: '**', permission: 'ALLOW' });
    const args: Record<string, unknown> = { command: 'echo hi' };
    const deny = await sb.prepareToolExecution('cmd_exec', 'cmd_run', 'echo', args);
    expect(deny).toBeUndefined();
    expect(args['cwd']).toBe(tmpRoot);
  });

  it('prepareToolExecution resolves fs path in args when allowed', async () => {
    const sb = new SecuritySandbox(mockHub, tmpRoot);
    sb.addRule({ action: 'fs_read', pattern: '**', permission: 'ALLOW' });
    const args: Record<string, unknown> = { path: 'rel/file.txt' };
    const deny = await sb.prepareToolExecution('fs_read', 'fs_read', 'rel/file.txt', args);
    expect(deny).toBeUndefined();
    expect(args['path']).toBe(path.join(tmpRoot, 'rel/file.txt'));
  });

  it('prepareToolExecution returns denial JSON when DENY', async () => {
    const sb = new SecuritySandbox(mockHub, tmpRoot);
    sb.addRule({ action: 'fs_read', pattern: '**', permission: 'DENY' });
    const raw = await sb.prepareToolExecution('fs_read', 'fs_read', 'x', { path: 'x' });
    expect(raw).toBeDefined();
    const body = JSON.parse(raw!);
    expect(body.status).toBe('denied');
    expect(body.tool).toBe('fs_read');
  });

  it('prepareToolExecution denies ASK when askPermission returns false', async () => {
    class NoAskSandbox extends SecuritySandbox {
      constructor() {
        super(mockHub, tmpRoot);
      }
      override async askPermission(_r: PermissionRequest): Promise<boolean> {
        return false;
      }
    }
    const sb = new NoAskSandbox();
    const raw = await sb.prepareToolExecution('web_fetch', 'web_fetch', 'https://x', {
      url: 'https://x',
    });
    expect(raw).toBeDefined();
    expect(JSON.parse(raw!).status).toBe('denied');
  });

  it('allows ASK when askPermission overridden', async () => {
    class YesSandbox extends SecuritySandbox {
      constructor() {
        super(mockHub, tmpRoot);
      }
      override async askPermission(_r: PermissionRequest): Promise<boolean> {
        return true;
      }
    }
    const sb = new YesSandbox();
    const args: Record<string, unknown> = { path: 'f' };
    const deny = await sb.prepareToolExecution('fs_read', 'fs_read', 'f', args);
    expect(deny).toBeUndefined();
  });

  it('getPermissionLevel scans rules last-to-first', () => {
    const sb = new SecuritySandbox(mockHub, tmpRoot);
    sb.addRule({ action: 'fs_read', pattern: '*', permission: 'ALLOW' });
    sb.addRule({ action: 'fs_read', pattern: '*', permission: 'DENY' });
    expect(sb.getPermissionLevel('fs_read', 'any')).toBe('DENY');
  });

  it('removeRules and clearRules mutate rule list', () => {
    const sb = new SecuritySandbox(mockHub, tmpRoot);
    sb.addRules([
      { action: 'fs_read', pattern: 'a', permission: 'ALLOW' },
      { action: 'fs_read', pattern: 'b', permission: 'DENY' },
    ]);
    expect(sb.removeRules('fs_read', 'a')).toBe(1);
    sb.clearRules();
    expect(sb.getRules()).toHaveLength(0);
  });

  it('matchPattern supports regex form', () => {
    const sb = new SecuritySandbox(mockHub, tmpRoot);
    sb.addRule({ action: 'fs_read', pattern: '/^\\/etc\\/.*$/', permission: 'DENY' });
    expect(sb.getPermissionLevel('fs_read', '/etc/passwd')).toBe('DENY');
  });
});
