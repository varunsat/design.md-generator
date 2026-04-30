import matter from 'gray-matter';
import { stringify as stringifyYaml } from 'yaml';
import type { DesignTokens } from './types.js';

export interface ParsedDesignMd {
  tokens: DesignTokens;
  body: string;
}

/**
 * Split a DESIGN.md text into its YAML front matter (parsed as DesignTokens)
 * and the markdown body that follows. Missing front matter yields an empty
 * tokens object.
 */
export function parseDesignMd(text: string): ParsedDesignMd {
  const parsed = matter(text);
  const tokens = (parsed.data ?? {}) as DesignTokens;
  return { tokens, body: parsed.content };
}

/**
 * Serialise tokens + body back into a complete DESIGN.md document, with
 * stable key ordering (`version`, `name`, `description`, then groups).
 */
export function serializeDesignMd(tokens: DesignTokens, body: string): string {
  const ordered = orderTokens(tokens);
  const yaml = stringifyYaml(ordered, { lineWidth: 0 }).trimEnd();
  const cleanBody = body.replace(/^\s+/, '');
  return `---\n${yaml}\n---\n\n${cleanBody}${cleanBody.endsWith('\n') ? '' : '\n'}`;
}

const KEY_ORDER: Array<keyof DesignTokens> = [
  'version',
  'name',
  'description',
  'colors',
  'typography',
  'rounded',
  'spacing',
  'components',
];

function orderTokens(tokens: DesignTokens): DesignTokens {
  const out: DesignTokens = {};
  for (const key of KEY_ORDER) {
    if (tokens[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[key] = tokens[key];
    }
  }
  for (const [k, v] of Object.entries(tokens)) {
    if (!(k in out) && v !== undefined) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

const SCAFFOLD_BODY = `## Overview

_Describe the visual identity in 2–3 sentences. Replace this paragraph with the answers to the prompts in \`design-md brief\`._

## Colors

_For each color token, describe its role and rationale._

## Typography

_For each typography level, describe its role (narrative, technical, label) and any conventions (casing, weight)._

## Layout

_Describe the layout strategy and spacing scale._

## Elevation & Depth

_Describe how visual hierarchy is conveyed._

## Shapes

_Describe the corner-radius language._

## Components

_Style guidance for component atoms._

## Do's and Don'ts

- Do …
- Don't …
`;

/**
 * Body used when scaffolding a brand-new DESIGN.md. The agent should
 * replace each placeholder paragraph using `design-md brief` as a guide.
 */
export function scaffoldBody(): string {
  return SCAFFOLD_BODY;
}
