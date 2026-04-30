import { detect } from '@varunsat/design-md-core';
import { resolveRoot } from '../util.js';

export interface DetectOptions {
  format?: 'json' | 'text';
}

export async function runDetect(path: string | undefined, options: DetectOptions): Promise<void> {
  const root = resolveRoot(path);
  const ctx = await detect(root);

  if (options.format === 'text') {
    if (ctx.frameworks.length === 0) {
      process.stdout.write('No frameworks detected.\n');
      return;
    }
    for (const f of ctx.frameworks) {
      process.stdout.write(`${f.id} (${f.confidence}) — ${f.evidence.join(', ')}\n`);
    }
    return;
  }

  process.stdout.write(JSON.stringify({ root: ctx.root, frameworks: ctx.frameworks }, null, 2) + '\n');
}
