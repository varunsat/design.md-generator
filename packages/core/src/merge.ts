import type { DesignTokens, Typography } from './types.js';

/**
 * Merge `extracted` tokens (fresh from the codebase) onto `existing`
 * tokens (read from a DESIGN.md). Extracted values win for keys that
 * both define; custom keys present only in `existing` are preserved.
 *
 * `components` is never auto-overwritten — they are typically authored
 * by hand and the codebase rarely reflects them faithfully enough to
 * regenerate them safely.
 */
export function mergeTokens(existing: DesignTokens, extracted: DesignTokens): DesignTokens {
  return {
    version: extracted.version ?? existing.version ?? 'alpha',
    name: existing.name ?? extracted.name,
    description: existing.description ?? extracted.description,
    colors: mergeMap(existing.colors, extracted.colors),
    typography: mergeTypography(existing.typography, extracted.typography),
    spacing: mergeMap(existing.spacing, extracted.spacing),
    rounded: mergeMap(existing.rounded, extracted.rounded),
    components: existing.components,
  };
}

function mergeMap<T>(
  a: Record<string, T> | undefined,
  b: Record<string, T> | undefined,
): Record<string, T> | undefined {
  if (!a && !b) return undefined;
  return { ...a, ...b };
}

function mergeTypography(
  a: Record<string, Typography> | undefined,
  b: Record<string, Typography> | undefined,
): Record<string, Typography> | undefined {
  if (!a && !b) return undefined;
  const out: Record<string, Typography> = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) {
    out[k] = { ...out[k], ...v };
  }
  return out;
}
