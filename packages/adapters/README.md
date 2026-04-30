# `@creoit.com/design-md-adapters`

Static adapter files for AI coding agents — Claude Code, Cursor, Antigravity. Consumed by [`@creoit.com/design-md`](https://www.npmjs.com/package/@creoit.com/design-md)'s `install` command. There is no programmatic API.

## Most users

You install these via the CLI, not this package directly:

```bash
npm i @creoit.com/design-md
npx design-md install --agent claude-code     # or: cursor, antigravity
```

## What's inside

| Path | Purpose |
|---|---|
| `claude-code/SKILL.md` | Claude Code skill (workflow doc with frontmatter) |
| `claude-code/commands/design-md.md` | `/design-md` slash command (auto-detects init vs update) |
| `claude-code/commands/design-md-init.md` | `/design-md-init` slash command |
| `claude-code/commands/design-md-update.md` | `/design-md-update` slash command |
| `cursor/design-md.mdc` | Cursor rule (auto-attaches when DESIGN.md is in context) |
| `antigravity/AGENTS.md` | AGENTS.md block for Antigravity and any agent that reads `AGENTS.md` |
| `_shared/workflow.md` | Canonical workflow document (source of truth, not directly consumed) |

The CLI's `install --agent <name>` command resolves this package's directory at runtime via `require.resolve` and copies the relevant files into the project at the conventional paths (e.g. `.claude/skills/...`, `.cursor/rules/...`, `AGENTS.md`).

## Source

[github.com/varunsat/design.md-generator](https://github.com/varunsat/design.md-generator) (`packages/adapters`)

## License

MIT © Creo IT
