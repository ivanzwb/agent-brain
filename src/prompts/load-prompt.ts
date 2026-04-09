import fs from 'fs';
import path from 'path';

const PROMPTS_ROOT = __dirname;

/** When set (unit tests only), read templates from this directory instead of `PROMPTS_ROOT`. */
let promptsRootOverride: string | undefined;

/**
 * Restrict template loading to another directory (e.g. `tests/.../fixtures`).
 * Pass `undefined` to restore default. Clears the raw-file cache.
 */
export function setPromptsRootForTesting(root: string | undefined): void {
  promptsRootOverride = root;
  rawCache.clear();
}

function getPromptsRoot(): string {
  return promptsRootOverride ?? PROMPTS_ROOT;
}

const rawCache = new Map<string, string>();

/** Matches `{{include:relative/path.md}}` (path relative to prompts root). */
const INCLUDE_RE = /\{\{include:([^}]+)\}\}/g;

function assertSafeRelativeInclude(ref: string, originPath: string): string {
  const rel = ref.trim().replace(/\\/g, '/');
  if (!rel) {
    throw new Error(`Empty include path in ${originPath}`);
  }
  if (rel.includes('..') || path.isAbsolute(rel)) {
    throw new Error(`Invalid include path in ${originPath}: "${ref}"`);
  }
  return rel;
}

/**
 * Read raw file bytes from disk (cached). Does not expand includes.
 */
function readPromptFile(relativePath: string): string {
  const hit = rawCache.get(relativePath);
  if (hit !== undefined) return hit;
  const full = path.join(getPromptsRoot(), relativePath);
  if (!fs.existsSync(full)) {
    throw new Error(`Prompt file not found: ${relativePath}`);
  }
  const text = fs.readFileSync(full, 'utf-8').replace(/\r\n/g, '\n').trimEnd();
  rawCache.set(relativePath, text);
  return text;
}

function expandIncludes(content: string, stack: Set<string>, originPath: string): string {
  return content.replace(INCLUDE_RE, (_match, ref: string) => {
    const rel = assertSafeRelativeInclude(ref, originPath);
    if (stack.has(rel)) {
      throw new Error(`Circular prompt include: ${[...stack, rel].join(' -> ')}`);
    }
    stack.add(rel);
    try {
      const nested = readPromptFile(rel);
      return expandIncludes(nested, stack, rel);
    } finally {
      stack.delete(rel);
    }
  });
}

/** Clear cached raw files (call after editing templates on disk at runtime). */
export function clearPromptTemplateCache(): void {
  rawCache.clear();
}

/**
 * Load a UTF-8 prompt relative to the prompts directory (e.g. `cognitive/plan.md`).
 * Expands nested `{{include:path/to/fragment.md}}` directives; detects cycles.
 */
export function loadPrompt(relativePath: string): string {
  const raw = readPromptFile(relativePath);
  return expandIncludes(raw, new Set(), relativePath);
}

/**
 * Replace `{{key}}` placeholders (whole keys only). Run after includes are expanded
 * so fragments can use the same vars as the parent template.
 */
export function interpolate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}
