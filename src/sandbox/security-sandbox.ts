import * as path from 'path';
import * as os from 'os';

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
  | 'web_fetch'    // HTTP requests
  | 'web_search'   // web search
  | 'skill_exec'   // skill tool execution
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

export interface SandboxConfig {
  /** Default working directory for all tools. Resolved paths are relative to this.
   *  Defaults to `os.tmpdir()/agent-sandbox-<uid>` */
  workingDirectory?: string;
  /** Default permission level when no rule matches (default: 'ASK') */
  defaultPermission?: PermissionLevel;
  /** Initial rules applied at construction time */
  rules?: PermissionRule[];
}

export interface PermissionRequest {
  action: ActionCategory;
  target: string;
  detail?: string;
}

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Callback that the host environment provides to handle ASK decisions.
 * Returns true if the user grants permission, false otherwise.
 */
export type AskHandler = (request: PermissionRequest) => Promise<boolean>;

export class SecuritySandbox {
  private readonly rules: PermissionRule[] = [];
  private readonly defaultPermission: PermissionLevel;
  private readonly _workingDirectory: string;
  private askHandler?: AskHandler;

  constructor(config: SandboxConfig = {}) {
    this.defaultPermission = config.defaultPermission ?? 'ASK';

    // Resolve working directory
    if (config.workingDirectory) {
      this._workingDirectory = path.resolve(config.workingDirectory);
    } else {
      this._workingDirectory = path.join(os.tmpdir(), `.bios-agent`);
    }

    // Apply initial rules
    if (config.rules) {
      for (const rule of config.rules) {
        this.rules.push({ ...rule });
      }
    }
  }

  /** The resolved working directory for the sandbox. */
  get workingDirectory(): string {
    return this._workingDirectory;
  }

  /**
   * Register the ASK handler that is called when permission level is ASK.
   * Typically wired to `ask_user` or the host's UI confirmation dialog.
   */
  setAskHandler(handler: AskHandler): void {
    this.askHandler = handler;
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
   * If no rule matches, `defaultPermission` applies.
   */
  getPermissionLevel(action: ActionCategory, target: string): PermissionLevel {
    // Scan rules in reverse (last added = highest priority)
    for (let i = this.rules.length - 1; i >= 0; i--) {
      const rule = this.rules[i];
      if (rule.action !== action) continue;
      if (!rule.pattern || this.matchPattern(rule.pattern, target)) {
        return rule.permission;
      }
    }
    return this.defaultPermission;
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

    // ASK
    if (!this.askHandler) {
      // No ask handler — deny for safety
      return { allowed: false, reason: 'Permission required but no ask handler available. Action denied for safety.' };
    }

    const granted = await this.askHandler(request);
    if (granted) {
      return { allowed: true, reason: 'Approved by user' };
    }
    return { allowed: false, reason: 'Denied by user' };
  }

  // ── Path resolution ──────────────────────────────────────

  /**
   * Resolve a path relative to the sandbox working directory.
   * Absolute paths are returned as-is.
   */
  resolvePath(filePath: string): string {
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
