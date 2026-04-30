import { describe, expect, it } from 'vitest';
import { parseDesignMd, scaffoldBody, serializeDesignMd } from './file.js';
import { mergeTokens } from './merge.js';

describe('parseDesignMd / serializeDesignMd', () => {
  it('round-trips front matter and body', () => {
    const original = `---
version: alpha
name: Demo
colors:
  primary: "#1A1C1E"
---

## Overview

Some prose.
`;
    const parsed = parseDesignMd(original);
    expect(parsed.tokens.name).toBe('Demo');
    expect(parsed.tokens.colors?.primary).toBe('#1A1C1E');
    expect(parsed.body.trim().startsWith('## Overview')).toBe(true);

    const out = serializeDesignMd(parsed.tokens, parsed.body);
    expect(out).toContain('name: Demo');
    expect(out).toContain('## Overview');
  });

  it('orders standard keys before custom ones', () => {
    const out = serializeDesignMd(
      {
        components: { 'button-primary': { backgroundColor: '#000' } },
        colors: { primary: '#000' },
        name: 'X',
        version: 'alpha',
      },
      '## Overview\n',
    );
    const yaml = out.split('---')[1]!;
    expect(yaml.indexOf('version')).toBeLessThan(yaml.indexOf('name'));
    expect(yaml.indexOf('name')).toBeLessThan(yaml.indexOf('colors'));
    expect(yaml.indexOf('colors')).toBeLessThan(yaml.indexOf('components'));
  });

  it('handles a missing front matter gracefully', () => {
    const parsed = parseDesignMd('# Untitled\n\nSome prose.');
    expect(parsed.tokens).toEqual({});
    expect(parsed.body).toContain('# Untitled');
  });

  it('scaffoldBody contains all eight canonical sections', () => {
    const body = scaffoldBody();
    expect(body).toContain('## Overview');
    expect(body).toContain('## Colors');
    expect(body).toContain('## Typography');
    expect(body).toContain('## Layout');
    expect(body).toContain('## Elevation & Depth');
    expect(body).toContain('## Shapes');
    expect(body).toContain('## Components');
    expect(body).toContain("## Do's and Don'ts");
  });
});

describe('mergeTokens', () => {
  it("favors extracted values for shared keys but keeps existing-only keys", () => {
    const merged = mergeTokens(
      { name: 'Demo', colors: { primary: '#000', custom: '#abc' } },
      { colors: { primary: '#FFF', extracted: '#fed' } },
    );
    expect(merged.name).toBe('Demo');
    expect(merged.colors).toEqual({
      primary: '#FFF',
      custom: '#abc',
      extracted: '#fed',
    });
  });

  it('never overwrites components', () => {
    const merged = mergeTokens(
      { components: { 'button-primary': { backgroundColor: '#000' } } },
      { components: { 'button-primary': { backgroundColor: '#FFF' } } },
    );
    expect(merged.components?.['button-primary']?.backgroundColor).toBe('#000');
  });

  it('deep-merges per-typography-level fields', () => {
    const merged = mergeTokens(
      { typography: { h1: { fontFamily: 'Inter', fontWeight: 700 } } },
      { typography: { h1: { fontSize: '48px' } } },
    );
    expect(merged.typography?.h1).toEqual({
      fontFamily: 'Inter',
      fontWeight: 700,
      fontSize: '48px',
    });
  });
});
