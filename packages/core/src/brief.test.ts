import { describe, expect, it } from 'vitest';
import { buildBrief } from './brief.js';
import type { ExtractionResult, ProjectContext } from './types.js';

const ctx: ProjectContext = {
  root: '/tmp/proj',
  packageJson: { name: 'demo' },
  frameworks: [{ id: 'tailwind-v4', confidence: 'high', evidence: ['tailwindcss@4.0.0'] }],
};

const extraction: ExtractionResult = {
  tokens: {
    colors: { primary: '#1A1C1E', accent: '#B8422E' },
    rounded: { md: '8px' },
  },
  sources: ['/tmp/proj/src/globals.css'],
  warnings: [],
};

describe('buildBrief', () => {
  it('emits a brief with header, summary, YAML, and section prompts', () => {
    const brief = buildBrief(ctx, extraction);
    expect(brief).toContain('# DESIGN.md generation brief');
    expect(brief).toContain('Project: **demo**');
    expect(brief).toContain('tailwind-v4');
    expect(brief).toContain('## YAML front matter');
    expect(brief).toContain('primary: "#1A1C1E"');
    expect(brief).toContain('### Overview');
    expect(brief).toContain('### Colors');
    expect(brief).toContain('### Typography');
    expect(brief).toContain("### Do's and Don'ts");
    expect(brief).toContain('npx @google/design.md lint DESIGN.md');
  });

  it("flags update mode and includes a token diff section", () => {
    const prev = { colors: { primary: '#000000' } };
    const brief = buildBrief(ctx, extraction, { mode: 'update', previous: prev });
    expect(brief).toContain('# DESIGN.md update brief');
    expect(brief).toContain('## Token diff vs. previous DESIGN.md');
    expect(brief).toContain('added: `accent`');
    expect(brief).toContain('modified: `primary`');
  });

  it('lists tokens under their respective section', () => {
    const brief = buildBrief(ctx, extraction);
    const colorsSection = brief.split('### Colors')[1]?.split('### ')[0] ?? '';
    expect(colorsSection).toContain('`primary`');
    expect(colorsSection).toContain('#1A1C1E');
  });

  it('surfaces extraction warnings at the end', () => {
    const withWarnings: ExtractionResult = { ...extraction, warnings: ['heuristic skipped X'] };
    const brief = buildBrief(ctx, withWarnings);
    expect(brief).toContain('## Extraction warnings');
    expect(brief).toContain('heuristic skipped X');
  });

  it("falls back to the directory name when no package.json name is set", () => {
    const noName: ProjectContext = { ...ctx, packageJson: {} };
    const brief = buildBrief(noName, extraction);
    expect(brief).toContain('Project: **proj**');
  });
});
