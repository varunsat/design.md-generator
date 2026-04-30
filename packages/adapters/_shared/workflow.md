# DESIGN.md workflow

The user has [`@creoit.com/design-md`](https://www.npmjs.com/package/@creoit.com/design-md) and [`@google/design.md`](https://github.com/google-labs-code/design.md) available via `npx`. Use them — do not author DESIGN.md by hand. The CLI does deterministic token extraction; **your job is the prose.**

## When to engage

Engage this workflow whenever the user asks to:

- **Create / generate / bootstrap** a DESIGN.md (or "design system file") for a project that does not yet have one.
- **Update / refresh / sync** an existing DESIGN.md after the codebase has changed.
- **Audit** a DESIGN.md for drift against the current code.

If the project root has no `DESIGN.md`, default to the **init** flow. Otherwise default to the **update** flow.

## Init flow

Use when no DESIGN.md exists.

1. **Confirm what was detected.** Run:
   ```bash
   npx @creoit.com/design-md detect
   ```
   If no frameworks are detected and the project is clearly a web app, ask the user where the styling lives before proceeding.
2. **Generate the scaffold + brief.** Run:
   ```bash
   npx @creoit.com/design-md init . --print-brief
   ```
   This writes a `DESIGN.md` with the YAML front matter (extracted tokens) and placeholder prose, and prints the agent brief to stdout.
3. **Read the brief carefully.** It contains, per section: the spec's purpose, the tokens to describe, and prompts. Treat the prompts as questions to answer.
4. **Edit DESIGN.md to fill in the prose.** Replace each placeholder paragraph with real content guided by the brief. Specifically:
   - **Overview**: 2–3 sentences capturing the brand personality, plus **product identity** — app name, tagline, logo placement and rules.
   - **Colors**: per-token rationale — what role each color plays, when *not* to use it.
   - **Typography**: per-family/level rationale — narrative voice vs. technical data, casing rules.
   - **Layout / Elevation / Shapes**: the strategy, not just the values.
   - **Components**: **be exhaustive**. Enumerate every component the product uses, grouped by category — Identity & chrome (Header, Footer, App name, Page Title/Subtitle, Section header), Actions (buttons, icon buttons), Inputs (text/select/checkbox/radio/switch), Containers (Card, Modal, Drawer), Navigation (Top/Side nav, Tabs, Breadcrumbs, Pagination), Feedback (Tooltip, Toast, Alert, Badge, Progress), Data display (List, Table, Avatar, Empty state). For each: purpose, which tokens it uses, variants and states. Add concrete `components:` YAML entries for the load-bearing ones.
   - **Do's and Don'ts**: 3–6 short rules; cover primary-action discipline, font/color mixing limits, WCAG AA contrast.
5. **Validate.** Run:
   ```bash
   npx @google/design.md lint DESIGN.md
   ```
   Fix every error and warning. Re-run until clean.

## Update flow

Use when DESIGN.md already exists and the codebase has changed.

1. **Re-scan with diff.** Run:
   ```bash
   npx @creoit.com/design-md update . --brief-only
   ```
   This compares current code-derived tokens against the existing `DESIGN.md` front matter and prints a delta brief without modifying the file. The brief flags which prose sections likely need revision.
2. **Triage the diff.** If the delta is empty, stop here — the user can see the report.
3. **Apply the token changes + revise prose.** Re-run:
   ```bash
   npx @creoit.com/design-md update .
   ```
   This rewrites the YAML front matter with the merged tokens (preserving custom keys and never overwriting `components`). Then edit only the prose sections flagged in the brief — leave untouched sections alone.
4. **Validate.** Run lint as in step 5 of Init.

## Constraints

- **Do not run an LLM call inside the CLI.** The CLI is deterministic.
- **Do not invent tokens that were not extracted.** If a color is missing, ask the user or leave it.
- **Do not reorder or rename canonical sections.** Spec order is: Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts.
- **Preserve `components`** in the front matter if they were authored by hand. The CLI does not overwrite them; you should not either unless the user asks.
- **Quote color hexes in YAML** — the spec requires `"#RRGGBB"`. The CLI handles this; do not strip the quotes when editing.
