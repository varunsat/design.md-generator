import { cac } from 'cac';
import { runBrief } from './commands/brief.js';
import { runDetect } from './commands/detect.js';
import { runScan } from './commands/scan.js';
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

cli.help();
cli.version('0.0.0');

const args = process.argv.slice(2);
if (args.length === 0) {
  cli.outputHelp();
  process.exit(0);
}

cli.parse(process.argv, { run: false });

cli.runMatchedCommand().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  fail(message);
});
