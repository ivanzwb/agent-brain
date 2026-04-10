import * as path from 'path';

// ============================================================
// Tool policy key helpers (host DB / UI / model id alignment)
//
// Mirrors naming used by hosts such as coobot: skill tools appear as
// `skill.{segment}.{logical}` in API calls while permission rows often use
// `skill:{displayName}:{logical}`. Use these helpers to normalize and expand
// lookup keys without pulling in SQLite or HTTP.
// ============================================================

/**
 * NFKC + trim + ASCII lower — DB / UI / model ids that differ only by unicode
 * or case still match the same permission row.
 */
export function normalizeToolPolicyKey(s: string): string {
  return s.normalize('NFKC').trim().toLowerCase();
}

/**
 * Models sometimes embed extra `skill:...` segments in the logical segment — normalize here.
 */
export function normalizeSkillToolLogicalName(raw: string): string {
  let t = raw.trim();
  if (!t.toLowerCase().startsWith('skill:')) return t;
  const parts = t.split(':').filter((p) => p.length > 0);
  if (parts.length >= 2 && parts[0].toLowerCase() === 'skill') {
    return parts[parts.length - 1] || t;
  }
  return t;
}

/** Map a possibly malformed `skill:*` API id to the canonical Hub / DB key shape. */
export function resolveSkillToolHubName(toolName: string): string {
  const m = toolName.match(/^skill:([^:]+):(.+)$/);
  if (!m) return toolName;
  const logical = normalizeSkillToolLogicalName(m[2]);
  return `skill:${m[1]}:${logical}`;
}

/** Canonical key: `skill:{skillDisplayName}:{manifestToolName}`. */
export function skillToolHubKey(skillDisplayName: string, toolNameFromManifest: string): string {
  return `skill:${skillDisplayName}:${normalizeSkillToolLogicalName(toolNameFromManifest)}`;
}

/**
 * Parse `skill.{segment}.{logical}` (AgentBrain / OpenAI tool name) into segments.
 * `segment` may be a skill id or display name; hosts map it to DB rows.
 */
export function parseSkillDotToolId(dotName: string): { segment: string; logical: string } | null {
  if (!dotName.startsWith('skill.')) return null;
  const rest = dotName.slice('skill.'.length);
  const idx = rest.lastIndexOf('.');
  if (idx <= 0) return null;
  const segment = rest.slice(0, idx);
  const logical = rest.slice(idx + 1);
  if (!logical) return null;
  return { segment, logical };
}

/**
 * Expand primary + alternate tool ids into a deduped list of permission lookup keys,
 * including `skill:` normal form and `skill.` → `skill:x:y` when parseable.
 * Hosts can append DB-resolved aliases (e.g. id → display name) in a second pass.
 */
export function expandToolPolicyCandidateKeys(
  primaryToolName: string,
  alternateToolNames?: string[],
): string[] {
  const raw = [primaryToolName, ...(alternateToolNames ?? [])].filter(
    (n, i, a): n is string =>
      typeof n === 'string' && n.length > 0 && a.indexOf(n) === i,
  );

  const out: string[] = [];
  const seen = new Set<string>();

  const add = (s: string | null | undefined) => {
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  for (const n of raw) add(n);

  for (const n of raw) {
    if (n.startsWith('skill:')) {
      add(resolveSkillToolHubName(n));
    }
    if (n.startsWith('skill.')) {
      const parsed = parseSkillDotToolId(n);
      if (parsed) {
        add(skillToolHubKey(parsed.segment, parsed.logical));
      }
    }
  }

  return out;
}

/**
 * Find first row whose `toolName` matches `candidate` after normalization.
 */
export function findPermissionRowByNormalizedKey<T extends { toolName: string }>(
  rows: T[],
  candidate: string,
): T | undefined {
  const want = normalizeToolPolicyKey(candidate);
  return rows.find((p) => normalizeToolPolicyKey(p.toolName) === want);
}

// ── Path guards (optional workspace checks for host sandboxes) ─────────────

/**
 * Whether `candidateAbs` is the root itself or a path inside `rootAbs` (no `..` escape).
 */
export function isPathContainedInRoot(candidateAbs: string, rootAbs: string): boolean {
  const root = path.resolve(rootAbs);
  const candidate = path.resolve(candidateAbs);
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** If `absPath` is under any blocked prefix (case-insensitive on Windows), return that prefix. */
export function pathMatchesBlockedPrefix(
  absPath: string,
  blockedPrefixes: string[],
): string | undefined {
  const lower = absPath.toLowerCase();
  for (const b of blockedPrefixes) {
    const bl = b.toLowerCase();
    if (lower === bl || lower.startsWith(bl + path.sep) || lower.startsWith(bl + '/')) {
      return b;
    }
  }
  return undefined;
}
