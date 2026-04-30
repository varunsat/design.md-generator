import {
  buildBrief,
  detect,
  extractAll,
  scaffoldBody,
  serializeDesignMd,
} from '@creoit/design-md-core';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fail, resolveRoot } from '../util.js';
import { fileExists } from '../fs-util.js';

export interface InitOptions {
  out?: string;
  name?: string;
  force?: boolean;
  printBrief?: boolean;
}

export async function runInit(path: string | undefined, options: InitOptions): Promise<void> {
  const root = resolveRoot(path);
  const outPath = resolve(root, options.out ?? 'DESIGN.md');

  if (!options.force && (await fileExists(outPath))) {
    fail(`${outPath} already exists. Use --force to overwrite, or run \`design-md update\`.`);
  }

  const ctx = await detect(root);
  const result = await extractAll(ctx);
  const tokens = {
    version: 'alpha',
    name: options.name ?? ctx.packageJson?.name ?? 'Untitled',
    ...result.tokens,
  };

  const file = serializeDesignMd(tokens, scaffoldBody());
  await writeFile(outPath, file, 'utf8');
  process.stderr.write(`wrote ${outPath}\n`);
  if (result.warnings.length > 0) {
    process.stderr.write(`(${result.warnings.length} warning(s) during extraction — re-run with \`design-md scan --format json\` to see them)\n`);
  }

  if (options.printBrief) {
    const brief = buildBrief(ctx, result, { name: options.name, mode: 'init' });
    process.stdout.write(brief);
  }
}
