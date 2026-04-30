import { detect, extractAll } from '@varunsat/design-md-core';
import { stringify as stringifyYaml } from 'yaml';
import { resolveRoot } from '../util.js';

export interface ScanOptions {
  format?: 'yaml' | 'json';
}

export async function runScan(path: string | undefined, options: ScanOptions): Promise<void> {
  const root = resolveRoot(path);
  const ctx = await detect(root);
  const result = await extractAll(ctx);

  if (options.format === 'json') {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  }

  process.stdout.write(stringifyYaml(result.tokens, { lineWidth: 0 }));
  if (result.warnings.length > 0) {
    process.stderr.write('\n# warnings\n');
    for (const w of result.warnings) process.stderr.write(`# ${w}\n`);
  }
}
