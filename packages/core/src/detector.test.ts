import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detect } from './detector.js';

async function tmpProject(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dmd-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

describe('detect', () => {
  it('finds tailwind v3 from a config file', async () => {
    const root = await tmpProject({
      'package.json': JSON.stringify({ devDependencies: { tailwindcss: '^3.4.0' } }),
      'tailwind.config.ts': 'export default {};',
    });
    const ctx = await detect(root);
    const ids = ctx.frameworks.map((f) => f.id);
    expect(ids).toContain('tailwind-v3');
    expect(ids).not.toContain('tailwind-v4');
  });

  it('finds tailwind v4 from package version', async () => {
    const root = await tmpProject({
      'package.json': JSON.stringify({ dependencies: { tailwindcss: '^4.0.0' } }),
    });
    const ctx = await detect(root);
    const ids = ctx.frameworks.map((f) => f.id);
    expect(ids).toContain('tailwind-v4');
    expect(ids).not.toContain('tailwind-v3');
  });

  it('finds shadcn from components.json', async () => {
    const root = await tmpProject({
      'package.json': '{}',
      'components.json': '{}',
    });
    const ctx = await detect(root);
    expect(ctx.frameworks.map((f) => f.id)).toContain('shadcn');
  });

  it('finds css vars from a :root block', async () => {
    const root = await tmpProject({
      'package.json': '{}',
      'src/styles.css': ':root { --primary: #000; }',
    });
    const ctx = await detect(root);
    expect(ctx.frameworks.map((f) => f.id)).toContain('css-vars');
  });

  it('detects MUI / Chakra / Mantine via deps', async () => {
    const root = await tmpProject({
      'package.json': JSON.stringify({
        dependencies: {
          '@mui/material': '^5.0.0',
          '@chakra-ui/react': '^2.0.0',
          '@mantine/core': '^7.0.0',
        },
      }),
    });
    const ctx = await detect(root);
    const ids = ctx.frameworks.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(['mui', 'chakra', 'mantine']));
  });

  it('returns no frameworks for an empty project', async () => {
    const root = await tmpProject({ 'package.json': '{}' });
    const ctx = await detect(root);
    expect(ctx.frameworks).toEqual([]);
  });
});
