import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractTailwindV3 } from './tailwind-v3.js';
import { extractTailwindV4 } from './tailwind-v4.js';

async function tmpRoot(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dmd-tw-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    await mkdir(join(full, '..'), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

describe('extractTailwindV3', () => {
  it('extracts flattened colors from theme.extend.colors', async () => {
    const root = await tmpRoot({
      'tailwind.config.ts': `
        export default {
          theme: {
            extend: {
              colors: {
                primary: '#1A1C1E',
                blue: { 500: '#3b82f6', 700: '#1d4ed8' },
              },
            },
          },
        };
      `,
    });
    const r = await extractTailwindV3(join(root, 'tailwind.config.ts'));
    expect(r.tokens.colors).toEqual({
      primary: '#1A1C1E',
      'blue-500': '#3b82f6',
      'blue-700': '#1d4ed8',
    });
  });

  it('reads module.exports CJS form', async () => {
    const root = await tmpRoot({
      'tailwind.config.cjs': `
        module.exports = {
          theme: {
            colors: { primary: '#000' },
            borderRadius: { sm: '4px', md: '8px' },
          },
        };
      `,
    });
    const r = await extractTailwindV3(join(root, 'tailwind.config.cjs'));
    expect(r.tokens.colors).toEqual({ primary: '#000' });
    expect(r.tokens.rounded).toEqual({ sm: '4px', md: '8px' });
  });

  it('extracts fontFamily and fontSize into typography', async () => {
    const root = await tmpRoot({
      'tailwind.config.ts': `
        export default {
          theme: {
            extend: {
              fontFamily: { sans: ['Public Sans', 'sans-serif'], mono: 'Space Grotesk' },
              fontSize: { base: '16px', lg: ['18px', { lineHeight: '1.5' }] },
            },
          },
        };
      `,
    });
    const r = await extractTailwindV3(join(root, 'tailwind.config.ts'));
    expect(r.tokens.typography?.sans?.fontFamily).toBe('Public Sans, sans-serif');
    expect(r.tokens.typography?.mono?.fontFamily).toBe('Space Grotesk');
    expect(r.tokens.typography?.base?.fontSize).toBe('16px');
    expect(r.tokens.typography?.lg?.fontSize).toBe('18px');
  });

  it('warns on non-literal values rather than crashing', async () => {
    const root = await tmpRoot({
      'tailwind.config.ts': `
        import tokens from './tokens';
        export default {
          theme: {
            extend: {
              colors: { primary: tokens.primary, secondary: '#fff' },
            },
          },
        };
      `,
    });
    const r = await extractTailwindV3(join(root, 'tailwind.config.ts'));
    expect(r.tokens.colors).toEqual({ secondary: '#fff' });
    expect(r.warnings.some((w) => w.includes('primary'))).toBe(true);
  });
});

describe('extractTailwindV4', () => {
  it('extracts colors, radius, spacing, text, font from a @theme block', async () => {
    const root = await tmpRoot({
      'src/globals.css': `
        @import "tailwindcss";

        @theme {
          --color-primary: #1A1C1E;
          --color-secondary: oklch(0.7 0.15 200);
          --radius-md: 8px;
          --radius-full: 9999px;
          --spacing: 0.25rem;
          --spacing-lg: 32px;
          --text-base: 1rem;
          --font-sans: "Public Sans", sans-serif;
        }
      `,
    });
    const r = await extractTailwindV4(root);
    expect(r.tokens.colors).toEqual({
      primary: '#1A1C1E',
      secondary: 'oklch(0.7 0.15 200)',
    });
    expect(r.tokens.rounded).toEqual({ md: '8px', full: '9999px' });
    expect(r.tokens.spacing).toEqual({ base: '0.25rem', lg: '32px' });
    expect(r.tokens.typography?.base?.fontSize).toBe('1rem');
    // CSS quotes are preserved verbatim — they're meaningful in font-family lists.
    expect(r.tokens.typography?.sans?.fontFamily).toBe('"Public Sans", sans-serif');
  });

  it('handles @theme inline { ... } and ignores comments', async () => {
    const root = await tmpRoot({
      'app.css': `
        @theme inline {
          /* primary brand */
          --color-primary: #000;
        }
      `,
    });
    const r = await extractTailwindV4(root);
    expect(r.tokens.colors).toEqual({ primary: '#000' });
  });

  it('returns empty tokens when no @theme blocks exist', async () => {
    const root = await tmpRoot({
      'app.css': 'body { color: red; }',
    });
    const r = await extractTailwindV4(root);
    expect(r.tokens).toEqual({});
  });
});
