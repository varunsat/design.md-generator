# `@creoit.com/design-md`

Generate and maintain a [`DESIGN.md`](https://github.com/google-labs-code/design.md) for any web project, driven by an AI agent.

The CLI deterministically extracts design tokens from your codebase (Tailwind config, shadcn CSS variables, plain CSS custom properties). The AI agent writes the prose. The result is a single, lint-clean `DESIGN.md` describing your design system.

> **Status:** alpha. The DESIGN.md format itself is alpha; this generator tracks it.

## Quick start

### 1. Install the CLI

```bash
npm i @creoit.com/design-md
```

### 2. Install the agent adapter for your editor

```bash
# Claude Code
npx design-md install --agent claude-code

# Cursor
npx design-md install --agent cursor

# Antigravity (or any agent that reads AGENTS.md)
npx design-md install --agent antigravity
```

### 3. Use it

In Claude Code, type:

```
/design-md
```

It auto-detects: scaffolds a new `DESIGN.md` if none exists, otherwise refreshes the existing one against the current codebase. (`/design-md-init` and `/design-md-update` exist if you want to force a flow.)

In Cursor and Antigravity the workflow attaches automatically when `DESIGN.md` is in context — just ask the agent to "create" or "update" the design system file.

## What you get

The generated `DESIGN.md` follows the official spec: YAML front matter with extracted tokens (colors, typography, spacing, rounded, components) and Markdown sections — Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. The agent is prompted to be exhaustive in the Components section: header, footer, app name, page chrome, and every concrete component the product uses (buttons, inputs, cards, modals, navigation, feedback, data display) — each with its purpose, the tokens it pulls from, and its variants/states.

Validate with the official linter:

```bash
npx @google/design.md lint DESIGN.md
```

## Framework support

| Framework | What's extracted |
|---|---|
| Tailwind CSS v3 | `tailwind.config.{js,ts,cjs,mjs}` — colors, fontFamily, fontSize, spacing, borderRadius. Handles `satisfies Config` and `module.exports`. Flattens `blue.500` → `blue-500`. |
| Tailwind CSS v4 | `@theme` blocks (incl. `@theme inline`). Maps `--color-*`, `--radius-*`, `--spacing[-*]`, `--text-*`, `--font-*`. |
| shadcn/ui | `:root { --* }` blocks. Naked HSL triplets and `hsl()` are converted to `#RRGGBB` hex; `oklch()` preserved with a warning. |
| Plain CSS variables | `:root` blocks classified by value shape (color vs dimension). |

Planned: MUI, Chakra UI, Mantine, component pattern detection.

## CLI reference

```bash
# Inspection
npx design-md detect [path]                       # detected frameworks (JSON)
npx design-md scan   [path]                       # extracted tokens (YAML)
npx design-md brief  [path]                       # full agent brief (markdown)

# Write paths
npx design-md init   [path] [--out FILE] [--name NAME] [--print-brief]
npx design-md update [path] [--design FILE] [--brief-only] [--no-brief]

# Adapter installer
npx design-md install --agent claude-code|cursor|antigravity [path]

# Validation (delegated to @google/design.md, installed separately)
npx @google/design.md lint DESIGN.md
npx @google/design.md diff DESIGN.md DESIGN.new.md
```

The CLI never calls an LLM. Token extraction is deterministic; the agent writes the prose.

## Source

[github.com/varunsat/design.md-generator](https://github.com/varunsat/design.md-generator)

## License

MIT © Creo IT
