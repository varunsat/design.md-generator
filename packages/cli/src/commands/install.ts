import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fail, resolveRoot } from '../util.js';
import { fileExists } from '../fs-util.js';

const require = createRequire(import.meta.url);

export type AgentName = 'claude-code' | 'cursor' | 'antigravity';

interface FileMapping {
  from: string;
  to: string;
}

interface AgentManifest {
  files: FileMapping[];
  /** True when the destination is a shared file (AGENTS.md) we should append to. */
  appendableTargets?: string[];
}

const MANIFESTS: Record<AgentName, AgentManifest> = {
  'claude-code': {
    files: [
      { from: 'claude-code/SKILL.md', to: '.claude/skills/design-md/SKILL.md' },
      {
        from: 'claude-code/commands/design-md-init.md',
        to: '.claude/commands/design-md-init.md',
      },
      {
        from: 'claude-code/commands/design-md-update.md',
        to: '.claude/commands/design-md-update.md',
      },
    ],
  },
  cursor: {
    files: [{ from: 'cursor/design-md.mdc', to: '.cursor/rules/design-md.mdc' }],
  },
  antigravity: {
    files: [{ from: 'antigravity/AGENTS.md', to: 'AGENTS.md' }],
    appendableTargets: ['AGENTS.md'],
  },
};

export interface InstallOptions {
  agent?: AgentName;
  force?: boolean;
}

/**
 * Copy the static adapter files for the chosen agent into the project root.
 * For agents whose adapter target is a shared file (Antigravity's AGENTS.md),
 * existing content is appended-to under a delimiter rather than overwritten.
 */
export async function runInstall(path: string | undefined, options: InstallOptions): Promise<void> {
  const agent = options.agent;
  if (!agent) fail('--agent is required (claude-code | cursor | antigravity)');
  const manifest = MANIFESTS[agent];
  if (!manifest) fail(`unknown agent: ${agent}`);

  const root = resolveRoot(path);
  const adaptersDir = dirname(require.resolve('@creoit.com/design-md-adapters/package.json'));

  for (const file of manifest.files) {
    const src = join(adaptersDir, file.from);
    const dst = resolve(root, file.to);

    await mkdir(dirname(dst), { recursive: true });

    const exists = await fileExists(dst);
    const isAppendable = manifest.appendableTargets?.includes(file.to);

    if (exists && isAppendable && !options.force) {
      await appendUnderDelimiter(src, dst);
      process.stderr.write(`appended ${file.to}\n`);
      continue;
    }

    if (exists && !options.force) {
      process.stderr.write(`skipped ${file.to} (exists; use --force to overwrite)\n`);
      continue;
    }

    await copyFile(src, dst);
    process.stderr.write(`wrote ${file.to}\n`);
  }
}

const DELIM_BEGIN = '<!-- BEGIN @creoit.com/design-md adapter -->';
const DELIM_END = '<!-- END @creoit.com/design-md adapter -->';

/**
 * Append the adapter content to an existing file, wrapped in delimiters so
 * subsequent runs can replace just our block instead of duplicating it.
 */
async function appendUnderDelimiter(src: string, dst: string): Promise<void> {
  const newContent = (await readFile(src, 'utf8')).trimEnd();
  const block = `\n\n${DELIM_BEGIN}\n${newContent}\n${DELIM_END}\n`;
  const existing = await readFile(dst, 'utf8');
  const stripped = stripExistingBlock(existing);
  await writeFile(dst, `${stripped.trimEnd()}${block}`, 'utf8');
}

function stripExistingBlock(text: string): string {
  const startIdx = text.indexOf(DELIM_BEGIN);
  if (startIdx === -1) return text;
  const endIdx = text.indexOf(DELIM_END, startIdx);
  if (endIdx === -1) return text;
  return text.slice(0, startIdx) + text.slice(endIdx + DELIM_END.length);
}
