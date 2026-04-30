import { cac } from 'cac';
import { runBrief } from './commands/brief.js';
import { runDetect } from './commands/detect.js';
import { runInit } from './commands/init.js';
import { runInstall, type AgentName } from './commands/install.js';
import { runScan } from './commands/scan.js';
import { runUpdate } from './commands/update.js';
import { fail } from './util.js';

const cli = cac('design-md');

cli
  .command('detect [path]', 'Detect web/styling frameworks in a project')
  .option('--format <format>', 'Output format: json | text', { default: 'json' })
  .action(async (path: string | undefined, opts: { format: 'json' | 'text' }) => {
    await runDetect(path, { format: opts.format });
  });

cli
  .command('scan [path]', 'Extract design tokens (YAML by default)')
  .option('--format <format>', 'Output format: yaml | json', { default: 'yaml' })
  .action(async (path: string | undefined, opts: { format: 'yaml' | 'json' }) => {
    await runScan(path, { format: opts.format });
  });

cli
  .command('brief [path]', 'Print the agent brief as markdown')
  .option('--name <name>', 'Override the project name')
  .action(async (path: string | undefined, opts: { name?: string }) => {
    await runBrief(path, { name: opts.name });
  });

cli
  .command('init [path]', 'Scaffold a new DESIGN.md with extracted tokens + placeholder prose')
  .option('--out <file>', 'Output path (default DESIGN.md)')
  .option('--name <name>', 'Project name to use in the front matter')
  .option('--force', 'Overwrite the file if it already exists')
  .option('--print-brief', 'Also print the agent brief to stdout')
  .action(
    async (
      path: string | undefined,
      opts: { out?: string; name?: string; force?: boolean; printBrief?: boolean },
    ) => {
      await runInit(path, {
        out: opts.out,
        name: opts.name,
        force: opts.force,
        printBrief: opts.printBrief,
      });
    },
  );

cli
  .command('update [path]', 'Re-scan tokens and update an existing DESIGN.md, then emit a delta brief')
  .option('--design <file>', 'Path to the existing DESIGN.md (default DESIGN.md)')
  .option('--brief-only', 'Print only the delta brief; do not modify the file')
  .option('--no-brief', 'Update the file but do not print the brief')
  .action(
    async (
      path: string | undefined,
      opts: { design?: string; briefOnly?: boolean; brief?: boolean },
    ) => {
      await runUpdate(path, {
        design: opts.design,
        briefOnly: opts.briefOnly,
        printBrief: opts.brief !== false,
      });
    },
  );

cli
  .command('install [path]', 'Copy adapter files for an AI agent into the project')
  .option('--agent <agent>', 'claude-code | cursor | antigravity')
  .option('--force', 'Overwrite existing adapter files')
  .action(async (path: string | undefined, opts: { agent?: AgentName; force?: boolean }) => {
    await runInstall(path, { agent: opts.agent, force: opts.force });
  });

cli.help();
cli.version('0.6.4');

const args = process.argv.slice(2);
if (args.length === 0) {
  cli.outputHelp();
  process.exit(0);
}

cli.parse(process.argv, { run: false });

// runMatchedCommand returns undefined for built-in flags like --help/--version
// (cac handles those itself before any command match). Guard the chain.
const result = cli.runMatchedCommand();
if (result && typeof (result as Promise<unknown>).catch === 'function') {
  (result as Promise<unknown>).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    fail(message);
  });
}
