import { stringify as stringifyYaml } from 'yaml';
import type {
  DesignTokens,
  ExtractionResult,
  ProjectContext,
} from './types.js';

export interface BriefOptions {
  /** Project name to put in the front-matter `name` field. */
  name?: string;
  /** When true, include an "Update" preamble instead of "Init". */
  mode?: 'init' | 'update';
  /** When mode='update', the prior token state to diff against. */
  previous?: DesignTokens;
}

/**
 * Build a markdown agent brief: framework summary, ready-to-paste YAML
 * front matter, and section-by-section prompts the agent uses to author
 * the prose body of a DESIGN.md.
 *
 * Designed to be terse so it fits comfortably in an agent's context window.
 */
export function buildBrief(
  ctx: ProjectContext,
  extraction: ExtractionResult,
  options: BriefOptions = {},
): string {
  const mode = options.mode ?? 'init';
  const name =
    options.name ??
    ctx.packageJson?.name ??
    ctx.root.split('/').filter(Boolean).pop() ??
    'Untitled';

  const tokens: DesignTokens = {
    version: 'alpha',
    name,
    ...extraction.tokens,
  };

  const lines: string[] = [];
  lines.push(`# DESIGN.md ${mode === 'init' ? 'generation' : 'update'} brief`);
  lines.push('');
  lines.push(`Project: **${name}**`);
  lines.push(`Path: \`${ctx.root}\``);

  if (ctx.frameworks.length === 0) {
    lines.push('Detected frameworks: _none — extraction relied on file scanning only._');
  } else {
    lines.push(
      `Detected frameworks: ${ctx.frameworks
        .map((f) => `${f.id} _(${f.confidence})_`)
        .join(', ')}`,
    );
  }
  if (extraction.sources.length > 0) {
    lines.push('Sources scanned:');
    for (const src of extraction.sources) {
      lines.push(`- \`${src.replace(`${ctx.root}/`, '')}\``);
    }
  }
  lines.push('');

  lines.push('## Extracted token summary');
  lines.push('');
  lines.push(...summariseTokens(tokens));
  lines.push('');

  if (mode === 'update' && options.previous) {
    lines.push('## Token diff vs. previous DESIGN.md');
    lines.push('');
    lines.push(...diffSummary(options.previous, tokens));
    lines.push('');
  }

  lines.push('## YAML front matter');
  lines.push('');
  lines.push('Paste this between `---` fences at the top of the DESIGN.md.');
  lines.push('');
  lines.push('```yaml');
  lines.push(stringifyYaml(tokens, { lineWidth: 0 }).trimEnd());
  lines.push('```');
  lines.push('');

  lines.push('## Prose sections to write');
  lines.push('');
  lines.push(
    'Author each section as a Markdown `##` heading in the order below. ' +
      'Skip a section only if it does not apply to this project.',
  );
  lines.push('');
  for (const section of SECTIONS) {
    lines.push(...renderSection(section, tokens, mode, options.previous));
    lines.push('');
  }

  lines.push('## Validation');
  lines.push('');
  lines.push('After writing DESIGN.md, run:');
  lines.push('');
  lines.push('```bash');
  lines.push('npx @google/design.md lint DESIGN.md');
  if (mode === 'update' && options.previous) {
    lines.push('npx @google/design.md diff DESIGN.md.bak DESIGN.md');
  }
  lines.push('```');
  lines.push('');
  lines.push('Resolve every error and warning before committing.');

  if (extraction.warnings.length > 0) {
    lines.push('');
    lines.push('## Extraction warnings');
    lines.push('');
    for (const w of extraction.warnings) lines.push(`- ${w}`);
  }

  return lines.join('\n') + '\n';
}

function summariseTokens(t: DesignTokens): string[] {
  const out: string[] = [];
  const colors = Object.keys(t.colors ?? {}).length;
  const typography = Object.keys(t.typography ?? {}).length;
  const spacing = Object.keys(t.spacing ?? {}).length;
  const rounded = Object.keys(t.rounded ?? {}).length;
  const components = Object.keys(t.components ?? {}).length;
  out.push(`- **${colors}** colors`);
  out.push(`- **${typography}** typography levels`);
  out.push(`- **${spacing}** spacing tokens`);
  out.push(`- **${rounded}** rounded scale levels`);
  out.push(`- **${components}** components`);
  return out;
}

function diffSummary(prev: DesignTokens, next: DesignTokens): string[] {
  const out: string[] = [];
  const groups = ['colors', 'typography', 'spacing', 'rounded', 'components'] as const;
  for (const g of groups) {
    const a = (prev[g] ?? {}) as Record<string, unknown>;
    const b = (next[g] ?? {}) as Record<string, unknown>;
    const added = Object.keys(b).filter((k) => !(k in a));
    const removed = Object.keys(a).filter((k) => !(k in b));
    const modified = Object.keys(b).filter(
      (k) => k in a && JSON.stringify(a[k]) !== JSON.stringify(b[k]),
    );
    if (added.length === 0 && removed.length === 0 && modified.length === 0) continue;
    out.push(`### ${g}`);
    if (added.length) out.push(`- added: ${added.map((k) => `\`${k}\``).join(', ')}`);
    if (removed.length) out.push(`- removed: ${removed.map((k) => `\`${k}\``).join(', ')}`);
    if (modified.length) out.push(`- modified: ${modified.map((k) => `\`${k}\``).join(', ')}`);
  }
  if (out.length === 0) out.push('_No token-level changes._');
  return out;
}

interface SectionDef {
  title: string;
  purpose: string;
  /** Token group(s) this section primarily describes. */
  tokenGroup?: keyof DesignTokens;
  prompts: string[];
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Overview',
    purpose:
      'Holistic description of look and feel — brand personality, target audience, and the emotional response the UI should evoke.',
    prompts: [
      'What single sentence captures the visual identity? (e.g. "Architectural minimalism meets journalistic gravitas")',
      'Who is the audience and what tone matches them? (playful / professional / neutral / dense / spacious)',
      'When the spec is silent on a choice, what default should the agent reach for?',
    ],
  },
  {
    title: 'Colors',
    purpose: 'Defines the color palettes and the role each color plays in the system.',
    tokenGroup: 'colors',
    prompts: [
      'Describe each color in plain language (a "deep ink", a "warm limestone") and its intended role (headlines, calls-to-action, surfaces).',
      'Identify the *single* accent color reserved for primary actions, if any.',
      'Note any colors that should NOT appear in particular contexts.',
    ],
  },
  {
    title: 'Typography',
    purpose: 'Defines typography levels and the role each plays.',
    tokenGroup: 'typography',
    prompts: [
      'For each font family, name its function (narrative voice, technical data, etc.).',
      'Note casing, letter-spacing, and weight conventions for headlines, body, and labels.',
      'Call out any "do not mix more than N weights on a screen" rules.',
    ],
  },
  {
    title: 'Layout',
    purpose: 'Layout and spacing strategy — grid model, containment principles, density.',
    tokenGroup: 'spacing',
    prompts: [
      'Is the layout a fluid grid, a fixed-max-width grid, or margin/safe-area driven?',
      'What is the base spacing unit and the rationale for the scale (e.g., 8px with 4px half-step)?',
      'How are related items grouped — cards, sections, dividers?',
    ],
  },
  {
    title: 'Elevation & Depth',
    purpose: 'How visual hierarchy is conveyed: shadows, tonal layers, borders, contrast.',
    prompts: [
      'Is depth conveyed via shadows, tonal layers, or flat-with-borders?',
      'If shadows: what spread/blur/color combinations are allowed?',
      'If flat: what alternative cues separate sibling surfaces?',
    ],
  },
  {
    title: 'Shapes',
    purpose: 'Corner-radius language and how it relates to the brand.',
    tokenGroup: 'rounded',
    prompts: [
      'What does the radius scale signal — sharpness, friendliness, neutrality?',
      'Are there contexts where a different radius is required (e.g., pill buttons, modal corners)?',
    ],
  },
  {
    title: 'Components',
    purpose: 'Style guidance for component atoms (buttons, chips, lists, inputs, ...).',
    tokenGroup: 'components',
    prompts: [
      'For each component variant, describe the intended use and any state behavior (hover, pressed, disabled).',
      'Highlight components whose appearance is *load-bearing* for the brand.',
    ],
  },
  {
    title: "Do's and Don'ts",
    purpose: 'Practical guardrails — common pitfalls and explicit allowances.',
    prompts: [
      'List 3–6 short rules in "Do/Don\'t" form.',
      'Cover at least: primary-action usage, color/font mixing, accessibility (WCAG AA contrast).',
    ],
  },
];

function renderSection(
  section: SectionDef,
  tokens: DesignTokens,
  _mode: 'init' | 'update',
  prev?: DesignTokens,
): string[] {
  const out: string[] = [];
  out.push(`### ${section.title}`);
  out.push('');
  out.push(`_${section.purpose}_`);

  if (section.tokenGroup) {
    const items = tokens[section.tokenGroup] as Record<string, unknown> | undefined;
    if (items && Object.keys(items).length > 0) {
      out.push('');
      out.push('Tokens to describe:');
      for (const [k, v] of Object.entries(items)) {
        out.push(`- \`${k}\`: ${formatValue(v)}`);
      }
    }

    if (prev) {
      const prevGroup = prev[section.tokenGroup] as Record<string, unknown> | undefined;
      const changedKeys = diffKeys(prevGroup, items);
      if (changedKeys.length > 0) {
        out.push('');
        out.push(
          `**Updates needed** — ${changedKeys.length} token(s) changed since the last DESIGN.md: ${changedKeys
            .map((k) => `\`${k}\``)
            .join(', ')}.`,
        );
      }
    }
  }

  out.push('');
  out.push('Prompts:');
  for (const p of section.prompts) out.push(`- ${p}`);
  return out;
}

function diffKeys(
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined,
): string[] {
  const a = prev ?? {};
  const b = next ?? {};
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}
