import fs from 'fs';
import path from 'path';
import { CognitivePhase } from '../types';
import { interpolate, loadPrompt } from './load-prompt';

// ============================================================
// Prompt registry — keyword → template path (directory = category)
// ============================================================

export interface PromptTemplateEntry {
  readonly id: string;
  readonly path: string;
  readonly category: string;
  readonly keywords: readonly string[];
  readonly description: string;
}

interface RegistryFile {
  version: number;
  templates: PromptTemplateEntry[];
}

export interface PromptBlock {
  /** Any registered keyword for the template */
  keyword: string;
  /** Optional `{{key}}` substitution for this block only */
  vars?: Record<string, string>;
}

export interface ComposePromptOptions {
  /** Joins rendered blocks; default `\n\n` */
  separator?: string;
}

/** Canonical keyword for each cognitive phase (use with getPromptByKeyword / composePrompt). */
export const COGNITIVE_PHASE_PROMPT_KEYWORD: Record<CognitivePhase, string> = {
  [CognitivePhase.PERCEIVE]: 'cognitive.perceive',
  [CognitivePhase.ASSESS]: 'cognitive.assess',
  [CognitivePhase.PLAN]: 'cognitive.plan',
  [CognitivePhase.EXECUTE]: 'cognitive.execute',
  [CognitivePhase.REFLECT]: 'cognitive.reflect',
};

const REGISTRY_PATH = path.join(__dirname, 'registry.json');

let keywordToPath: Map<string, string> | undefined;
let idToEntry: Map<string, PromptTemplateEntry> | undefined;

function buildIndexes(registry: RegistryFile): void {
  const kwMap = new Map<string, string>();
  const byId = new Map<string, PromptTemplateEntry>();

  for (const t of registry.templates) {
    if (byId.has(t.id)) {
      throw new Error(`Duplicate prompt template id: ${t.id}`);
    }
    byId.set(t.id, t);

    for (const kw of t.keywords) {
      if (kwMap.has(kw)) {
        throw new Error(
          `Duplicate prompt keyword "${kw}" (templates "${kwMap.get(kw)}" vs "${t.path}")`,
        );
      }
      kwMap.set(kw, t.path);
    }
  }

  keywordToPath = kwMap;
  idToEntry = byId;
}

function loadRegistryFile(): RegistryFile {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  const data = JSON.parse(raw) as RegistryFile;
  if (!data.templates || !Array.isArray(data.templates)) {
    throw new Error('Invalid prompts/registry.json: missing templates[]');
  }
  return data;
}

function ensureIndexes(): void {
  if (keywordToPath && idToEntry) return;
  const registry = loadRegistryFile();
  buildIndexes(registry);
}

/**
 * Reload registry from disk (e.g. after editing registry.json in tests).
 * Clears template file cache for paths that were registered.
 */
export function reloadPromptRegistry(): void {
  keywordToPath = undefined;
  idToEntry = undefined;
  ensureIndexes();
}

/** Resolve filesystem path (relative to prompts root) for a keyword or template id. */
export function resolvePromptPath(keywordOrId: string): string {
  ensureIndexes();
  const pathRel = keywordToPath!.get(keywordOrId);
  if (pathRel) return pathRel;
  const byId = idToEntry!.get(keywordOrId);
  if (byId) return byId.path;
  throw new Error(`Unknown prompt keyword or id: ${keywordOrId}`);
}

/** Load template body by keyword (or template id). */
export function getPromptByKeyword(keywordOrId: string): string {
  return loadPrompt(resolvePromptPath(keywordOrId));
}

/** Apply vars to a single template resolved by keyword. */
export function renderPrompt(keywordOrId: string, vars?: Record<string, string>): string {
  const body = getPromptByKeyword(keywordOrId);
  return vars && Object.keys(vars).length > 0 ? interpolate(body, vars) : body;
}

/**
 * Assemble multiple templates in order. Each block may use its own `vars`.
 */
export function composePrompt(blocks: PromptBlock[], options?: ComposePromptOptions): string {
  const sep = options?.separator ?? '\n\n';
  return blocks.map((b) => renderPrompt(b.keyword, b.vars)).join(sep);
}

/** List registered templates, optionally filtered by category directory name (e.g. `cognitive`, `react`). */
export function listPromptTemplates(filter?: { category?: string }): PromptTemplateEntry[] {
  ensureIndexes();
  const all = [...idToEntry!.values()];
  if (!filter?.category) return all;
  return all.filter((t) => t.category === filter.category);
}

/** All distinct category names from the registry. */
export function listPromptCategories(): string[] {
  ensureIndexes();
  const set = new Set<string>();
  for (const t of idToEntry!.values()) set.add(t.category);
  return [...set].sort();
}

/** All keywords pointing at the same template file as the given keyword. */
export function aliasesForPrompt(keywordOrId: string): string[] {
  ensureIndexes();
  const rel = resolvePromptPath(keywordOrId);
  const entry = [...idToEntry!.values()].find((t) => t.path === rel);
  return entry ? [...entry.keywords] : [];
}
