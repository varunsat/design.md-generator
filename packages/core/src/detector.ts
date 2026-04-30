import { glob } from 'tinyglobby';
import { join } from 'node:path';
import type { FrameworkDetection, ProjectContext } from './types.js';
import { fileExists, findFirstExisting, readPackageJson, readTextFile } from './utils/fs.js';
import { depVersion, parseMajor } from './utils/version.js';

const TAILWIND_V3_CONFIGS = [
  'tailwind.config.ts',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
];

/**
 * Detect web frameworks and styling systems in a project.
 *
 * The detector inspects package.json and a small set of canonical config
 * files. It never executes user code. Multiple frameworks can be detected
 * simultaneously (e.g., Tailwind v4 + shadcn + CSS vars).
 */
export async function detect(root: string): Promise<ProjectContext> {
  const packageJson = await readPackageJson(root);
  const frameworks: FrameworkDetection[] = [];

  await detectTailwind(root, packageJson, frameworks);
  await detectShadcn(root, frameworks);
  detectUiKits(packageJson, frameworks);
  await detectCssVars(root, frameworks);

  return { root, packageJson, frameworks };
}

async function detectTailwind(
  root: string,
  pkg: ProjectContext['packageJson'],
  out: FrameworkDetection[],
): Promise<void> {
  const version = depVersion(pkg, 'tailwindcss');
  const configPath = await findFirstExisting(root, TAILWIND_V3_CONFIGS);
  const major = version ? parseMajor(version) : undefined;

  if (major !== undefined && major >= 4) {
    const evidence = [`tailwindcss@${version}`];
    out.push({ id: 'tailwind-v4', confidence: 'high', evidence });
    return;
  }

  if (configPath) {
    const evidence = [configPath.replace(`${root}/`, '')];
    if (version) evidence.unshift(`tailwindcss@${version}`);
    out.push({ id: 'tailwind-v3', confidence: 'high', evidence });
    return;
  }

  if (version) {
    out.push({
      id: 'tailwind-v3',
      confidence: 'medium',
      evidence: [`tailwindcss@${version} (no config file found)`],
    });
  }
}

async function detectShadcn(root: string, out: FrameworkDetection[]): Promise<void> {
  const componentsJson = join(root, 'components.json');
  if (await fileExists(componentsJson)) {
    out.push({
      id: 'shadcn',
      confidence: 'high',
      evidence: ['components.json'],
    });
  }
}

function detectUiKits(
  pkg: ProjectContext['packageJson'],
  out: FrameworkDetection[],
): void {
  const mui = depVersion(pkg, '@mui/material');
  if (mui) out.push({ id: 'mui', confidence: 'high', evidence: [`@mui/material@${mui}`] });

  const chakra = depVersion(pkg, '@chakra-ui/react');
  if (chakra) out.push({ id: 'chakra', confidence: 'high', evidence: [`@chakra-ui/react@${chakra}`] });

  const mantine = depVersion(pkg, '@mantine/core');
  if (mantine) out.push({ id: 'mantine', confidence: 'high', evidence: [`@mantine/core@${mantine}`] });
}

const CSS_GLOB = ['**/*.css', '**/*.scss'];
const CSS_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
];

/**
 * Look for any :root block with at least one --custom property. This is a
 * fallback detection — most projects with Tailwind/shadcn will already have
 * css-vars semantics covered, but plain-CSS projects need this signal.
 */
async function detectCssVars(root: string, out: FrameworkDetection[]): Promise<void> {
  const files = await glob(CSS_GLOB, { cwd: root, ignore: CSS_IGNORE, absolute: true });
  for (const file of files.slice(0, 50)) {
    const text = await readTextFile(file);
    if (!text) continue;
    if (/:root\s*\{[^}]*--[\w-]+\s*:/s.test(text)) {
      out.push({
        id: 'css-vars',
        confidence: 'low',
        evidence: [file.replace(`${root}/`, '')],
      });
      return;
    }
  }
}
