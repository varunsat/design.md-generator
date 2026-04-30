import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import type { NodePath } from '@babel/traverse';
import type {
  ObjectExpression,
  ObjectProperty,
  Expression,
  Node,
} from '@babel/types';
import type { DesignTokens, ExtractionResult, Typography } from '../types.js';
import { readTextFile } from '../utils/fs.js';

// @babel/traverse ships CJS-default; ESM consumers see it on .default.
const traverse = (_traverse as unknown as { default?: typeof _traverse }).default ?? _traverse;

const THEME_KEYS = ['colors', 'fontFamily', 'fontSize', 'spacing', 'borderRadius'] as const;
type ThemeKey = (typeof THEME_KEYS)[number];

/**
 * Statically extract design tokens from a Tailwind v3 config file.
 *
 * The config is parsed as a JS/TS AST and only literal values are pulled
 * out — `colors`, `fontFamily`, `fontSize`, `spacing`, `borderRadius` from
 * both `theme` and `theme.extend`. Any non-literal expression (spread,
 * function call, identifier) is skipped and a warning is recorded.
 *
 * No user code is executed.
 */
export async function extractTailwindV3(configPath: string): Promise<ExtractionResult> {
  const text = await readTextFile(configPath);
  if (!text) {
    return { tokens: {}, sources: [], warnings: [`Could not read ${configPath}`] };
  }

  const warnings: string[] = [];
  const tokens: DesignTokens = {};

  let ast;
  try {
    ast = parse(text, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch (e) {
    return {
      tokens: {},
      sources: [configPath],
      warnings: [`Failed to parse ${configPath}: ${(e as Error).message}`],
    };
  }

  let configRoot: ObjectExpression | undefined;

  traverse(ast, {
    ExportDefaultDeclaration(path: NodePath) {
      const decl = (path.node as { declaration: Node }).declaration;
      if (decl.type === 'ObjectExpression') configRoot = decl as ObjectExpression;
      else if (decl.type === 'TSAsExpression' && decl.expression.type === 'ObjectExpression') {
        configRoot = decl.expression as ObjectExpression;
      }
    },
    AssignmentExpression(path: NodePath) {
      const node = path.node as {
        left: { type: string; object?: { name?: string }; property?: { name?: string } };
        right: Node;
      };
      if (
        node.left.type === 'MemberExpression' &&
        node.left.object?.name === 'module' &&
        node.left.property?.name === 'exports' &&
        node.right.type === 'ObjectExpression'
      ) {
        configRoot = node.right as ObjectExpression;
      }
    },
  });

  if (!configRoot) {
    warnings.push('No default export or module.exports object found');
    return { tokens, sources: [configPath], warnings };
  }

  const themeObj = findProperty(configRoot, 'theme');
  if (!themeObj || themeObj.type !== 'ObjectExpression') {
    return { tokens, sources: [configPath], warnings };
  }

  const themeRoot = themeObj as ObjectExpression;
  const extendObj = findProperty(themeRoot, 'extend');
  const extend = extendObj?.type === 'ObjectExpression' ? (extendObj as ObjectExpression) : undefined;

  for (const key of THEME_KEYS) {
    const direct = findProperty(themeRoot, key);
    const extended = extend ? findProperty(extend, key) : undefined;
    const merged: Record<string, unknown> = {};
    if (direct?.type === 'ObjectExpression') {
      Object.assign(merged, flattenObjectExpression(direct as ObjectExpression, warnings, key));
    }
    if (extended?.type === 'ObjectExpression') {
      Object.assign(merged, flattenObjectExpression(extended as ObjectExpression, warnings, key));
    }
    if (Object.keys(merged).length > 0) {
      mergeIntoTokens(tokens, key, merged, warnings);
    }
  }

  return { tokens, sources: [configPath], warnings };
}

function findProperty(obj: ObjectExpression, name: string): Expression | undefined {
  for (const prop of obj.properties) {
    if (prop.type !== 'ObjectProperty') continue;
    if (propKeyName(prop) === name) return prop.value as Expression;
  }
  return undefined;
}

function propKeyName(prop: ObjectProperty): string | undefined {
  if (prop.computed) return undefined;
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'StringLiteral') return prop.key.value;
  if (prop.key.type === 'NumericLiteral') return String(prop.key.value);
  return undefined;
}

/**
 * Flatten a Tailwind theme group into dash-joined keys and primitive values.
 * Example: { blue: { 500: '#abc' } } -> { 'blue-500': '#abc' }.
 */
function flattenObjectExpression(
  obj: ObjectExpression,
  warnings: string[],
  pathPrefix: string,
  keyPrefix = '',
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const prop of obj.properties) {
    if (prop.type !== 'ObjectProperty') {
      warnings.push(`${pathPrefix}: skipped non-literal property (${prop.type})`);
      continue;
    }
    const name = propKeyName(prop);
    if (!name) {
      warnings.push(`${pathPrefix}: skipped computed key`);
      continue;
    }
    const fullKey = keyPrefix ? `${keyPrefix}-${name}` : name;
    const literal = literalValue(prop.value as Node);
    if (literal !== undefined) {
      out[fullKey] = literal;
      continue;
    }
    if (prop.value.type === 'ObjectExpression') {
      Object.assign(
        out,
        flattenObjectExpression(prop.value as ObjectExpression, warnings, pathPrefix, fullKey),
      );
      continue;
    }
    if (prop.value.type === 'ArrayExpression') {
      const arr = (prop.value as { elements: Array<Node | null> }).elements
        .map((el) => (el ? literalValue(el) : undefined))
        .filter((v): v is string | number => v !== undefined);
      if (arr.length > 0) {
        out[fullKey] = arr;
        continue;
      }
    }
    warnings.push(`${pathPrefix}.${fullKey}: skipped non-literal value (${prop.value.type})`);
  }
  return out;
}

function literalValue(node: Node): string | number | undefined {
  if (node.type === 'StringLiteral') return (node as { value: string }).value;
  if (node.type === 'NumericLiteral') return (node as { value: number }).value;
  if (node.type === 'TemplateLiteral') {
    const tl = node as { quasis: Array<{ value: { cooked?: string; raw: string } }>; expressions: unknown[] };
    if (tl.expressions.length === 0 && tl.quasis[0]) {
      return tl.quasis[0].value.cooked ?? tl.quasis[0].value.raw;
    }
  }
  return undefined;
}

function mergeIntoTokens(
  tokens: DesignTokens,
  key: ThemeKey,
  values: Record<string, unknown>,
  warnings: string[],
): void {
  switch (key) {
    case 'colors': {
      tokens.colors ??= {};
      for (const [name, value] of Object.entries(values)) {
        if (typeof value === 'string') tokens.colors[name] = value;
      }
      return;
    }
    case 'spacing': {
      tokens.spacing ??= {};
      for (const [name, value] of Object.entries(values)) {
        if (typeof value === 'string' || typeof value === 'number') {
          tokens.spacing[name] = value;
        }
      }
      return;
    }
    case 'borderRadius': {
      tokens.rounded ??= {};
      for (const [name, value] of Object.entries(values)) {
        if (typeof value === 'string') tokens.rounded[name] = value;
      }
      return;
    }
    case 'fontFamily': {
      tokens.typography ??= {};
      for (const [name, value] of Object.entries(values)) {
        const family = Array.isArray(value)
          ? value.filter((v): v is string => typeof v === 'string').join(', ')
          : typeof value === 'string'
            ? value
            : undefined;
        if (!family) continue;
        const existing = tokens.typography[name] ?? {};
        tokens.typography[name] = { ...existing, fontFamily: family } satisfies Typography;
      }
      return;
    }
    case 'fontSize': {
      tokens.typography ??= {};
      for (const [name, value] of Object.entries(values)) {
        const size = Array.isArray(value)
          ? typeof value[0] === 'string'
            ? value[0]
            : undefined
          : typeof value === 'string'
            ? value
            : undefined;
        if (!size) {
          warnings.push(`fontSize.${name}: unsupported value shape`);
          continue;
        }
        const existing = tokens.typography[name] ?? {};
        tokens.typography[name] = { ...existing, fontSize: size } satisfies Typography;
      }
      return;
    }
  }
}
