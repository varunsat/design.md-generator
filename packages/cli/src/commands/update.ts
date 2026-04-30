import {
  buildBrief,
  detect,
  extractAll,
  mergeTokens,
  parseDesignMd,
  serializeDesignMd,
} from '@varunsat/design-md-core';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fail, resolveRoot } from '../util.js';

export interface UpdateOptions {
  design?: string;
  printBrief?: boolean;
  /** Only emit the brief — do not modify the file. */
  briefOnly?: boolean;
}

export async function runUpdate(path: string | undefined, options: UpdateOptions): Promise<void> {
  const root = resolveRoot(path);
  const designPath = resolve(root, options.design ?? 'DESIGN.md');

  let raw: string;
  try {
    raw = await readFile(designPath, 'utf8');
  } catch {
    fail(`could not read ${designPath}. Did you mean \`design-md init\`?`);
  }

  const existing = parseDesignMd(raw);
  const ctx = await detect(root);
  const result = await extractAll(ctx);
  const merged = mergeTokens(existing.tokens, result.tokens);

  if (!options.briefOnly) {
    const updated = serializeDesignMd(merged, existing.body);
    await writeFile(designPath, updated, 'utf8');
    process.stderr.write(`updated ${designPath}\n`);
  }

  if (options.printBrief !== false) {
    const brief = buildBrief(ctx, result, {
      name: existing.tokens.name,
      mode: 'update',
      previous: existing.tokens,
    });
    process.stdout.write(brief);
  }
}
