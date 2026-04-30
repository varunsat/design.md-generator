import { buildBrief, detect, extractAll } from '@creoit.com/design-md-core';
import { resolveRoot } from '../util.js';

export interface BriefOptions {
  name?: string;
}

export async function runBrief(path: string | undefined, options: BriefOptions): Promise<void> {
  const root = resolveRoot(path);
  const ctx = await detect(root);
  const result = await extractAll(ctx);
  const brief = buildBrief(ctx, result, { name: options.name });
  process.stdout.write(brief);
}
