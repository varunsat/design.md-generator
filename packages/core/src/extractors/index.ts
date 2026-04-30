import type { DesignTokens, ExtractionResult, ProjectContext } from '../types.js';
import { findFirstExisting } from '../utils/fs.js';
import { extractTailwindV3 } from './tailwind-v3.js';
import { extractTailwindV4 } from './tailwind-v4.js';

const TAILWIND_V3_CONFIGS = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
];

/**
 * Run every extractor that matches a detected framework, then merge their
 * outputs into a single DesignTokens object.
 */
export async function extractAll(ctx: ProjectContext): Promise<ExtractionResult> {
  const tokens: DesignTokens = {};
  const sources: string[] = [];
  const warnings: string[] = [];

  for (const fw of ctx.frameworks) {
    if (fw.id === 'tailwind-v3') {
      const cfg = await findFirstExisting(ctx.root, TAILWIND_V3_CONFIGS);
      if (!cfg) continue;
      mergeResult(tokens, sources, warnings, await extractTailwindV3(cfg));
    } else if (fw.id === 'tailwind-v4') {
      mergeResult(tokens, sources, warnings, await extractTailwindV4(ctx.root));
    }
  }

  return { tokens, sources, warnings };
}

function mergeResult(
  tokens: DesignTokens,
  sources: string[],
  warnings: string[],
  result: ExtractionResult,
): void {
  sources.push(...result.sources);
  warnings.push(...result.warnings);
  if (result.tokens.colors) {
    tokens.colors = { ...tokens.colors, ...result.tokens.colors };
  }
  if (result.tokens.typography) {
    tokens.typography = { ...tokens.typography };
    for (const [k, v] of Object.entries(result.tokens.typography)) {
      tokens.typography[k] = { ...tokens.typography[k], ...v };
    }
  }
  if (result.tokens.spacing) {
    tokens.spacing = { ...tokens.spacing, ...result.tokens.spacing };
  }
  if (result.tokens.rounded) {
    tokens.rounded = { ...tokens.rounded, ...result.tokens.rounded };
  }
  if (result.tokens.components) {
    tokens.components = { ...tokens.components, ...result.tokens.components };
  }
}

export { extractTailwindV3, extractTailwindV4 };
