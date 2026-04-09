import fs from 'fs';
import path from 'path';

const PROMPTS_ROOT = __dirname;

const cache = new Map<string, string>();

/**
 * Load a UTF-8 prompt template relative to the prompts directory (e.g. `cognitive/perceive.md`).
 */
export function loadPrompt(relativePath: string): string {
  const hit = cache.get(relativePath);
  if (hit !== undefined) return hit;
  const full = path.join(PROMPTS_ROOT, relativePath);
  const text = fs.readFileSync(full, 'utf-8').replace(/\r\n/g, '\n').trimEnd();
  cache.set(relativePath, text);
  return text;
}

/** Replace `{{key}}` placeholders (non-regex, whole keys only). */
export function interpolate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}
