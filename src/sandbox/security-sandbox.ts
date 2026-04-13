import * as path from 'path';
import * as os from 'os';

import type { InnateToolHub } from '../innate-tools/innate-tool-hub';

// ============================================================
// Security Sandbox — Permission-based execution guard
// ============================================================

/**
 * Permission level for a specific action or pattern.
 * - ALLOW: execute without prompting
 * - DENY:  reject immediately
 * - ASK:   prompt the user before executing (default)
 */
export type PermissionLevel = 'ALLOW' | 'DENY' | 'ASK';

/**
 * Action category that can be guarded by the sandbox.
 */
export type ActionCategory =
  | 'cmd_exec'     // shell command execution
  | 'cmd_run'      // node script execution
  | 'cmd_bg'       // background process
  | 'cmd_kill'     // kill process
  | 'fs_read'      // read file
  | 'fs_write'     // write / create file
  | 'fs_edit'      // edit file
  | 'fs_delete'    // delete file/dir
  | 'fs_mkdir'     // create directory
  | 'fs_list'      // list directory
  | 'web_fetch'    // HTTP requests
  | 'web_search'   // web search
  | 'memory_query' // memory read operations (search, history)
  | 'memory_write' // memory write operations (save, delete)
  | 'knowledge_query' // knowledge read operations (list, search)
  | 'knowledge_write' // knowledge write operations (add, delete)
  | 'cron_query'   // cron read operations (list, status)
  | 'cron_write'   // cron write operations (add, delete, pause, resume, run)
  | 'skill_exec'   // skill tool execution
  | 'user_interaction' // ask_user tool
  ;

export interface PermissionRule {
  /** Action category */
  action: ActionCategory;
  /** Optional glob/regex pattern for the target (path, command, url).
   *  If omitted, applies to ALL targets in the action category. */
  pattern?: string;
  /** Permission level */
  permission: PermissionLevel;
}

export interface PermissionRequest {
  action: ActionCategory;
  target: string;
  detail?: string;
  /** Tool id being guarded (innate name or `skill.*` / `skill:...` style). */
  toolName?: string;
}

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Permission checks for the execute-phase ReAct loop. Pass an instance via {@link AgentBrainOptions.sandbox},
 * or omit to use the built-in rule sandbox (ASK → `ask_user`).
 *
 * For custom behavior, **subclass** and override only {@link askPermission}.
 * Use {@link resolvePath} from overrides when normalizing paths.
 */
export class SecuritySandbox {
  private readonly rules: PermissionRule[] = [];
  private readonly _workingDirectory: string;
  private readonly _innateToolHub: InnateToolHub;

  /**
   * Built-in rule sandbox: no rules until added via {@link addRule} / {@link addRules}
   * (subclass or host wrapper). When no rule matches, permission is always **ASK**.
   *
   * @param innateToolHub Hub to prompt the user for permission via `requestUserInput`.
   * @param workingDirectory Resolved working directory for tools; defaults to `os.tmpdir()/.bios-agent`.
   *        When using AgentBrain with the built-in sandbox, set `AgentConfig.workingDirectory`.
   */
  constructor(innateToolHub: InnateToolHub, workingDirectory?: string) {
    if (workingDirectory) {
      this._workingDirectory = path.resolve(workingDirectory);
    } else {
      this._workingDirectory = path.join(os.tmpdir(), `.bios-agent`);
    }
    this._innateToolHub = innateToolHub;
  }

  /** The resolved working directory for the sandbox. */
  get workingDirectory(): string {
    return this._workingDirectory;
  }

  /**
   * Convenience method that computes action and permissionTarget from tool metadata.
   * Uses the innateToolHub to determine action category and permission target.
   */
  async checkToolPermission(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string | undefined> {
    const action: ActionCategory = this._innateToolHub.getActionCategory(toolName) ?? 'skill_exec';
    const permissionTarget = this._innateToolHub.hasTool(toolName)
      ? this._innateToolHub.getPermissionTarget(toolName, args)
      : `${(args['skillName'] as string) ?? ''}:${toolName}`;

    return this.prepareToolExecution(action, toolName, permissionTarget, args);
  }

  /**
   * Default: ask user via innateToolHub.
   * Override or subclass for custom behavior.
   */
  async askPermission(request: PermissionRequest): Promise<boolean> {
    const question =
      `[Security Sandbox] Permission required:\n` +
      `  Action: ${request.action}\n` +
      `  Target: ${request.target}\n` +
      (request.detail ? `  Detail: ${request.detail}\n` : '') +
      `\nAllow this action? (yes/no)`;
    const answer = await this._innateToolHub.requestUserInput(question);
    return /^(y|yes|allow|ok|确认|允许|是)$/i.test(answer.trim());
  }

  // ── Rule management ──────────────────────────────────────

  /** Add a single permission rule. Later rules take higher priority. */
  addRule(rule: PermissionRule): void {
    this.rules.push({ ...rule });
  }

  /** Batch-add permission rules. */
  addRules(rules: PermissionRule[]): void {
    for (const r of rules) {
      this.rules.push({ ...r });
    }
  }

  /** Remove all rules matching an action (and optionally a pattern). */
  removeRules(action: ActionCategory, pattern?: string): number {
    let removed = 0;
    for (let i = this.rules.length - 1; i >= 0; i--) {
      const r = this.rules[i];
      if (r.action === action && (pattern === undefined || r.pattern === pattern)) {
        this.rules.splice(i, 1);
        removed++;
      }
    }
    return removed;
  }

  /** Clear all rules. */
  clearRules(): void {
    this.rules.length = 0;
  }

  /** Get a snapshot of all current rules. */
  getRules(): PermissionRule[] {
    return this.rules.map(r => ({ ...r }));
  }

  // ── Permission checking ──────────────────────────────────

  /**
   * Check permission for an action against the current rules.
   * Rules are scanned from last to first (later rules = higher priority).
   * If no rule matches, returns **ASK** (fixed default).
   */
  getPermissionLevel(action: ActionCategory, target: string): PermissionLevel {
    for (let i = this.rules.length - 1; i >= 0; i--) {
      const rule = this.rules[i];
      if (rule.action !== action) continue;
      if (!rule.pattern || this.matchPattern(rule.pattern, target)) {
        return rule.permission;
      }
    }
    return 'ASK';
  }

  /**
   * Full permission check that may prompt the user via askHandler.
   * Returns a decision with `allowed` flag and a human-readable `reason`.
   */
  async checkPermission(request: PermissionRequest): Promise<PermissionDecision> {
    const level = this.getPermissionLevel(request.action, request.target);

    if (level === 'ALLOW') {
      return { allowed: true, reason: 'Allowed by sandbox rule' };
    }

    if (level === 'DENY') {
      return { allowed: false, reason: `Denied by sandbox rule: ${request.action} on "${request.target}"` };
    }

    const granted = await this.askPermission(request);
    if (granted) {
      return { allowed: true, reason: 'Approved by user' };
    }
    return { allowed: false, reason: 'Denied by user' };
  }

  /**
   * Resolve `permissionTarget` for the check, run {@link checkPermission}, then when allowed
   * apply working-directory and path normalization to `args` for `fs_*` / `cmd_*` tools.
   * @param permissionTarget Target before path resolution (e.g. relative path for `fs_*`).
   * @param args Tool call arguments; may be mutated when permission is granted.
   * @returns Denial JSON string, or `undefined` if the tool may run.
   */
  async prepareToolExecution(
    action: ActionCategory,
    toolName: string,
    permissionTarget: string,
    args: Record<string, unknown>,
  ): Promise<string | undefined> {
    const resolvedTarget = action.startsWith('fs_')
      ? this.resolvePath(permissionTarget)
      : permissionTarget;

    const decision = await this.checkPermission({
      action,
      target: resolvedTarget,
      detail: `${toolName}: ${permissionTarget}`,
      toolName,
    });

    if (!decision.allowed) {
      return JSON.stringify({
        status: 'denied',
        tool: toolName,
        target: permissionTarget,
        reason: decision.reason,
      });
    }

    if (action.startsWith('cmd_') && !args['cwd']) {
      args['cwd'] = this._workingDirectory;
    }
    if (action.startsWith('fs_') && args['path']) {
      args['path'] = resolvedTarget;
    }
    if (action.startsWith('fs_') && args['directory']) {
      args['directory'] = this.resolvePath(args['directory'] as string);
    }

    return undefined;
  }

  /** Resolve a path relative to the sandbox working directory; absolute paths unchanged. */
  protected resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(this._workingDirectory, filePath);
  }

  // ── Pattern matching ─────────────────────────────────────

  private matchPattern(pattern: string, target: string): boolean {
    // Support basic glob patterns
    if (pattern === '*' || pattern === '**') {
      return true;
    }
    // Regex pattern (starts and ends with /)
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      try {
        return new RegExp(pattern.slice(1, -1)).test(target);
      } catch {
        return false;
      }
    }
    // Glob-style: convert to regex
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '__GLOBSTAR__')
      .replace(/\*/g, '[^/\\\\]*')
      .replace(/__GLOBSTAR__/g, '.*');
    return new RegExp(`^${escaped}$`).test(target);
  }
}
