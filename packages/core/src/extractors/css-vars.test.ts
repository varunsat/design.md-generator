import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractCssVars } from './css-vars.js';

async function tmpRoot(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dmd-css-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

describe('extractCssVars (shadcn mode)', () => {
  it('classifies semantic shadcn vars and converts naked HSL triplets to hex', async () => {
    const root = await tmpRoot({
      'src/globals.css': `
        :root {
          --background: 0 0% 100%;
          --foreground: 222.2 84% 4.9%;
          --primary: 222.2 47.4% 11.2%;
          --primary-foreground: 210 40% 98%;
          --radius: 0.5rem;
        }
      `,
    });
    const r = await extractCssVars(root, { shadcn: true });
    expect(r.tokens.colors?.background).toBe('#FFFFFF');
    expect(r.tokens.colors?.foreground).toMatch(/^#[0-9A-F]{6}$/);
    expect(r.tokens.colors?.primary).toMatch(/^#[0-9A-F]{6}$/);
    expect(r.tokens.rounded?.base).toBe('0.5rem');
  });

  it('preserves oklch values and warns', async () => {
    const root = await tmpRoot({
      'app.css': `
        :root {
          --primary: oklch(0.21 0.034 264.665);
        }
      `,
    });
    const r = await extractCssVars(root, { shadcn: true });
    expect(r.tokens.colors?.primary).toContain('oklch');
    expect(r.warnings.some((w) => w.includes('primary'))).toBe(true);
  });

  it('handles multiple :root blocks across files', async () => {
    const root = await tmpRoot({
      'a.css': ':root { --primary: 0 0% 0%; }',
      'b.css': ':root { --secondary: 0 0% 100%; }',
    });
    const r = await extractCssVars(root, { shadcn: true });
    expect(r.tokens.colors?.primary).toBe('#000000');
    expect(r.tokens.colors?.secondary).toBe('#FFFFFF');
  });
});

describe('extractCssVars (generic)', () => {
  it('classifies hex colors and dimensions by value shape', async () => {
    const root = await tmpRoot({
      'app.css': `
        :root {
          --brand: #3b82f6;
          --gap: 16px;
          --border-radius: 8px;
        }
      `,
    });
    const r = await extractCssVars(root);
    expect(r.tokens.colors?.brand).toBe('#3B82F6');
    expect(r.tokens.spacing?.gap).toBe('16px');
    expect(r.tokens.rounded?.['border-radius']).toBe('8px');
  });

  it('returns empty tokens when no :root vars exist', async () => {
    const root = await tmpRoot({ 'app.css': 'body { color: red; }' });
    const r = await extractCssVars(root);
    expect(r.tokens).toEqual({});
  });
});
