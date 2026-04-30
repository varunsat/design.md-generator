# design-md-generator

Generate and maintain a [`DESIGN.md`](https://github.com/google-labs-code/design.md) for any web project, driven by AI coding agents.

`design-md-generator` is a CLI plus a set of agent adapters (Claude Code, Cursor, Antigravity) that:

1. **Detects** the web framework and styling system in a codebase.
2. **Extracts** design tokens deterministically from theme configs and CSS.
3. **Briefs** an AI agent so it can author the prose sections of a `DESIGN.md`.
4. **Updates** an existing `DESIGN.md` when the codebase changes — computes a token-level delta and points the agent at the prose sections that need revision.

The token format and validator come from Google's open-source [`@google/design.md`](https://github.com/google-labs-code/design.md). This project is the *generator* — the part that bootstraps a `DESIGN.md` from an existing codebase and keeps it in sync.

## Status

**Alpha.** The format itself is alpha; this generator tracks it. Expect breaking changes.

## How it works

```
┌──────────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│   Codebase   │ ─▶ │   detect +   │ ─▶ │  agent brief   │ ─▶ │  DESIGN.md   │
│ (any web FW) │    │   extract    │    │ (md to agent)  │    │ (lint-clean) │
└──────────────┘    └──────────────┘    └────────────────┘    └──────────────┘
                          │                      │
                    deterministic         agent writes prose
                  (tokens, framework)     (Overview, rationale,
                                           Do's and Don'ts, ...)
```

The CLI never calls an LLM itself. Token extraction is deterministic; prose is delegated to whichever AI agent the user has configured (Claude Code, Cursor, Antigravity).

## Quick start

```bash
# 1. Install the agent adapter for your editor
npx @varunsat/design-md install --agent claude-code     # or: cursor, antigravity

# 2. Ask your AI agent: "create a DESIGN.md for this project"
#    Under the hood the agent will run:
npx @varunsat/design-md detect                         # confirm framework
npx @varunsat/design-md init . --print-brief           # scaffold + brief
# ...the agent edits DESIGN.md to fill in prose...
npx @google/design.md lint DESIGN.md                 # validate
```

For an existing DESIGN.md, ask the agent to "update DESIGN.md against the current codebase". The adapter triggers `update --brief-only`, the agent revises only the sections flagged in the delta brief, then runs `update` to rewrite the front matter.

## CLI

```bash
# Read-only — inspect what the generator sees
npx @varunsat/design-md detect [path]                   # detected frameworks (JSON)
npx @varunsat/design-md scan [path]                     # extracted tokens (YAML)
npx @varunsat/design-md brief [path]                    # full agent brief (markdown)

# Write paths
npx @varunsat/design-md init [path] [--out DESIGN.md] [--name X] [--print-brief]
npx @varunsat/design-md update [path] [--design DESIGN.md] [--brief-only] [--no-brief]

# Agent adapter installer
npx @varunsat/design-md install --agent claude-code [path]
npx @varunsat/design-md install --agent cursor       [path]
npx @varunsat/design-md install --agent antigravity  [path]

# Validation (delegated to @google/design.md — installed separately)
npx @google/design.md lint DESIGN.md
npx @google/design.md diff DESIGN.md DESIGN.new.md
```

`design-md scan` writes YAML to stdout and warnings to stderr, so `npx @varunsat/design-md scan > tokens.yaml` produces a clean file.

## Framework support

**v0.1 (now):**

- Tailwind CSS v3 — `tailwind.config.{js,ts,cjs,mjs}` parsed as JS/TS AST. Handles `export default {...} satisfies Config` and `module.exports`. Flattens nested colors (`blue.500` → `blue-500`).
- Tailwind CSS v4 — `@theme` blocks (incl. `@theme inline`) in any `.css` file. Maps `--color-*`, `--radius-*`, `--spacing[-*]`, `--text-*`, `--font-*`.
- shadcn/ui — `:root { --* }` blocks. Naked HSL triplets and `hsl()` are converted to `#RRGGBB` hex for spec compliance. `oklch()` is preserved with a warning.
- Vanilla CSS variables — generic `:root` blocks, classified by value shape (color vs dimension).

**Planned:**

- MUI (`createTheme`)
- Chakra UI (`extendTheme`)
- Mantine (`createTheme`)
- Component pattern detection (auto-derive `components.button-primary` etc. from `components/ui/`).

## Agent adapters

Each adapter is a static file describing the workflow. The CLI never imposes logic on the agent — it just provides the deterministic extraction step.

| Agent | Installs to | Format |
|---|---|---|
| Claude Code | `.claude/skills/design-md/SKILL.md` + `.claude/commands/design-md-{init,update}.md` | SKILL frontmatter + slash-command files |
| Cursor | `.cursor/rules/design-md.mdc` | Cursor `.mdc` rule |
| Antigravity | `AGENTS.md` (appended under a delimited block — idempotent) | Plain markdown |

## Repo layout

```
packages/
├── core/        # @varunsat/design-md-core   – detection, extraction, brief, merge, file
├── cli/         # @varunsat/design-md        – the CLI
└── adapters/    # @varunsat/design-md-adapters – static adapter files
examples/
├── next-tailwind-v4/   # smoke fixture
└── vite-shadcn/        # smoke fixture
```

## Development

```bash
pnpm install
pnpm test          # 31 tests across detector, extractors, brief, file, merge
pnpm typecheck
pnpm build         # builds core then cli (topological)
```

## Design

- **CLI-first.** Works in any agent's sandbox, in CI, and as a pre-commit hook.
- **Adapters are static.** Each agent gets a thin file telling it *when* to fire and *which CLI commands to run*. No agent-specific logic in the core.
- **Validation is delegated.** `@google/design.md lint` and `diff` are the source of truth — we don't reimplement them.
- **Deterministic extraction, agent prose.** The CLI never calls an LLM; the agent never edits the YAML by hand.

## License

[MIT](LICENSE) © Creo IT
