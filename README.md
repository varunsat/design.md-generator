# design-md-generator

Generate and maintain a [`DESIGN.md`](https://github.com/google-labs-code/design.md) for any web project, driven by AI coding agents.

`design-md-generator` is a CLI plus a set of agent adapters (Claude Code, Cursor, Antigravity) that:

1. **Detects** the web framework and styling system in a codebase.
2. **Extracts** design tokens deterministically from theme configs and CSS.
3. **Briefs** an AI agent so it can author the prose sections of a `DESIGN.md`.
4. **Updates** an existing `DESIGN.md` when the codebase changes, computing a token-level delta and pointing the agent at the prose sections that need revision.

The token format and validator come from Google's open-source [`@google/design.md`](https://github.com/google-labs-code/design.md). This project is the *generator*: the part that bootstraps a `DESIGN.md` from an existing codebase and keeps it in sync.

## Status

**Alpha.** The format itself is alpha; this generator tracks it. Expect breaking changes.

## How it works

```
┌──────────────┐    ┌──────────────┐    ┌────────────────┐    ┌──────────────┐
│   Codebase   │ -> │   detect +   │ -> │  agent brief   │ -> │  DESIGN.md   │
│ (any web FW) │    │   extract    │    │ (md to agent)  │    │ (lint-clean) │
└──────────────┘    └──────────────┘    └────────────────┘    └──────────────┘
                          │                      │
                    deterministic         agent writes prose
                  (tokens, framework)     (Overview, rationale,
                                           Do's and Don'ts, ...)
```

The CLI never calls an LLM itself. Token extraction is deterministic; prose is delegated to whichever AI agent the user has configured (Claude Code, Cursor, Antigravity).

## Install

> Not yet published. Local development only.

```bash
pnpm install
pnpm build
```

## Usage (planned)

```bash
# Read-only: inspect what the generator sees
npx design-md detect              # detected frameworks
npx design-md scan                # extracted tokens (YAML)
npx design-md brief               # full agent brief (markdown)

# Write paths
npx design-md init                # scaffold a new DESIGN.md
npx design-md update              # diff codebase against existing DESIGN.md

# Validation (delegated to @google/design.md)
npx @google/design.md lint DESIGN.md
npx @google/design.md diff DESIGN.md DESIGN.new.md

# Install agent adapter
npx design-md install --agent claude-code
npx design-md install --agent cursor
npx design-md install --agent antigravity
```

## Framework support

**v0.1 (MVP):**

- Tailwind CSS v3 (`tailwind.config.{js,ts,cjs,mjs}`)
- Tailwind CSS v4 (`@theme` blocks in CSS)
- shadcn/ui (CSS variables in `globals.css`)
- Vanilla CSS variables (`:root { --* }`)

**Planned:**

- MUI (`createTheme`)
- Chakra UI (`extendTheme`)
- Mantine (`createTheme`)
- Component pattern detection (auto-derive `components.button-primary` etc.)

## Design

- **CLI-first.** Works in any agent's sandbox, in CI, and as a pre-commit hook.
- **Adapters are static.** Each agent gets a thin file telling it *when* to fire and *which CLI commands to run*. No agent-specific logic in the core.
- **Validation is delegated.** `@google/design.md lint` and `diff` are the source of truth — we don't reimplement them.

## License

[MIT](LICENSE) © Creo IT
