import { glob } from 'tinyglobby';
import type { DesignTokens, ExtractionResult } from '../types.js';
import { isColorValue, isDimensionValue, toHex } from '../utils/color.js';
import { readTextFile } from '../utils/fs.js';

const CSS_GLOB = ['**/*.css', '**/*.scss'];
const CSS_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
];

export interface CssVarsOptions {
  /** True for shadcn projects: name-based classification, HSL→hex conversion. */
  shadcn?: boolean;
}

interface ParsedVar {
  name: string;
  value: string;
  source: string;
}

/**
 * Extract design tokens from CSS custom properties defined in `:root` blocks.
 *
 * Two modes:
 *   - shadcn: classifies vars by name convention (radius -> rounded,
 *     everything else with a color-shaped value -> colors). HSL triplets are
 *     converted to hex for spec compliance.
 *   - generic: classifies by value (color-shaped vs dimension-shaped) and
 *     leaves ambiguous cases out.
 */
export async function extractCssVars(
  root: string,
  options: CssVarsOptions = {},
): Promise<ExtractionResult> {
  const files = await glob(CSS_GLOB, { cwd: root, ignore: CSS_IGNORE, absolute: true });
  const vars: ParsedVar[] = [];
  const sources = new Set<string>();

  for (const file of files) {
    const text = await readTextFile(file);
    if (!text || !text.includes(':root')) continue;
    const blocks = findRootBlocks(text);
    if (blocks.length === 0) continue;
    sources.add(file);
    for (const block of blocks) {
      for (const [name, value] of Object.entries(parseRootBlock(block))) {
        vars.push({ name, value, source: file });
      }
    }
  }

  const tokens: DesignTokens = {};
  const warnings: string[] = [];

  for (const { name, value } of vars) {
    if (options.shadcn) {
      classifyShadcn(tokens, name, value, warnings);
    } else {
      classifyByValue(tokens, name, value, warnings);
    }
  }

  return { tokens, sources: [...sources], warnings };
}

function findRootBlocks(css: string): string[] {
  const out: string[] = [];
  const re = /:root\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    while (i < css.length && depth > 0) {
      const ch = css[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      i++;
    }
    if (depth === 0) out.push(css.slice(start, i - 1));
  }
  return out;
}

function parseRootBlock(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\/\*.*?\*\//g, '').trim();
    if (!line || !line.startsWith('--')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const name = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.endsWith(';')) value = value.slice(0, -1).trim();
    if (!value) continue;
    out[name] = value;
  }
  return out;
}

function classifyShadcn(
  tokens: DesignTokens,
  rawName: string,
  rawValue: string,
  warnings: string[],
): void {
  const name = rawName.replace(/^--/, '');
  const value = stripQuotes(rawValue);

  if (name === 'radius' || name.startsWith('radius-')) {
    const key = name === 'radius' ? 'base' : name.slice('radius-'.length);
    tokens.rounded ??= {};
    if (isDimensionValue(value)) tokens.rounded[key] = value;
    return;
  }

  if (name.startsWith('font-')) {
    const key = name.slice('font-'.length);
    tokens.typography ??= {};
    tokens.typography[key] = { ...tokens.typography[key], fontFamily: value };
    return;
  }

  // shadcn convention: most other named vars are colors, often as a naked
  // HSL triplet (`222.2 84% 4.9%`) or oklch in newer versions.
  if (isColorValue(value) || /^\s*[\d.]+\s+[\d.]+%\s+[\d.]+%/.test(value)) {
    const hex = toHex(value);
    tokens.colors ??= {};
    if (hex) {
      tokens.colors[name] = hex;
    } else {
      tokens.colors[name] = value;
      warnings.push(`shadcn: ${rawName} (${value}) could not be converted to hex`);
    }
  }
}

function classifyByValue(
  tokens: DesignTokens,
  rawName: string,
  rawValue: string,
  warnings: string[],
): void {
  const name = rawName.replace(/^--/, '');
  const value = stripQuotes(rawValue);

  if (isColorValue(value)) {
    const hex = toHex(value);
    tokens.colors ??= {};
    tokens.colors[name] = hex ?? value;
    if (!hex) warnings.push(`css-vars: ${rawName} (${value}) is a color in non-sRGB form`);
    return;
  }

  if (isDimensionValue(value)) {
    if (name === 'radius' || name.startsWith('radius') || name.endsWith('-radius')) {
      tokens.rounded ??= {};
      tokens.rounded[name] = value;
    } else {
      tokens.spacing ??= {};
      tokens.spacing[name] = value;
    }
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
