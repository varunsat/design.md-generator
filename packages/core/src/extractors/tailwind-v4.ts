import { glob } from 'tinyglobby';
import type { DesignTokens, ExtractionResult, Typography } from '../types.js';
import { readTextFile } from '../utils/fs.js';

const CSS_GLOB = ['**/*.css'];
const CSS_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
];

/**
 * Extract design tokens from Tailwind v4 `@theme` blocks.
 *
 * Tailwind v4 defines tokens as CSS custom properties inside `@theme {}`:
 *
 *   @theme {
 *     --color-primary: #1A1C1E;
 *     --radius-md: 8px;
 *     --spacing: 0.25rem;
 *     --text-base: 1rem;
 *     --font-sans: "Public Sans", sans-serif;
 *   }
 *
 * Mapping:
 *   --color-<name>   -> colors.<name>
 *   --radius-<name>  -> rounded.<name>
 *   --spacing[-<n>]  -> spacing.<n|base>
 *   --text-<name>    -> typography.<name>.fontSize
 *   --font-<name>    -> typography.<name>.fontFamily
 */
export async function extractTailwindV4(root: string): Promise<ExtractionResult> {
  const files = await glob(CSS_GLOB, { cwd: root, ignore: CSS_IGNORE, absolute: true });
  const tokens: DesignTokens = {};
  const sources: string[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    const text = await readTextFile(file);
    if (!text || !text.includes('@theme')) continue;
    const blocks = findThemeBlocks(text);
    if (blocks.length === 0) continue;
    sources.push(file);
    for (const block of blocks) {
      mergeBlock(tokens, parseThemeBlock(block), warnings);
    }
  }

  return { tokens, sources, warnings };
}

/**
 * Find every `@theme { ... }` block, including the inline-default-export form
 * `@theme inline { ... }`. Brace-counting handles nested rules cleanly.
 */
function findThemeBlocks(css: string): string[] {
  const blocks: string[] = [];
  const re = /@theme\b[^{]*\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < css.length && depth > 0) {
      const ch = css[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    if (depth === 0) blocks.push(css.slice(start, i - 1));
  }
  return blocks;
}

function parseThemeBlock(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const trimmed = line.replace(/\/\*.*?\*\//g, '').trim();
    if (!trimmed || !trimmed.startsWith('--')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const name = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.endsWith(';')) value = value.slice(0, -1).trim();
    if (!value) continue;
    out[name] = value;
  }
  return out;
}

function mergeBlock(
  tokens: DesignTokens,
  vars: Record<string, string>,
  warnings: string[],
): void {
  for (const [rawName, rawValue] of Object.entries(vars)) {
    const name = rawName.replace(/^--/, '');
    const value = stripQuotes(rawValue);

    if (name.startsWith('color-')) {
      const key = name.slice('color-'.length);
      if (!key) continue;
      tokens.colors ??= {};
      tokens.colors[key] = value;
      continue;
    }
    if (name.startsWith('radius-')) {
      const key = name.slice('radius-'.length);
      if (!key) continue;
      tokens.rounded ??= {};
      tokens.rounded[key] = value;
      continue;
    }
    if (name === 'spacing') {
      tokens.spacing ??= {};
      tokens.spacing.base = value;
      continue;
    }
    if (name.startsWith('spacing-')) {
      const key = name.slice('spacing-'.length);
      if (!key) continue;
      tokens.spacing ??= {};
      tokens.spacing[key] = value;
      continue;
    }
    if (name.startsWith('text-')) {
      const key = name.slice('text-'.length);
      if (!key) continue;
      tokens.typography ??= {};
      const existing: Typography = tokens.typography[key] ?? {};
      tokens.typography[key] = { ...existing, fontSize: value };
      continue;
    }
    if (name.startsWith('font-')) {
      const key = name.slice('font-'.length);
      if (!key) continue;
      tokens.typography ??= {};
      const existing: Typography = tokens.typography[key] ?? {};
      tokens.typography[key] = { ...existing, fontFamily: value };
      continue;
    }
    warnings.push(`tailwind v4: --${name} not mapped to a known token group`);
  }
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
