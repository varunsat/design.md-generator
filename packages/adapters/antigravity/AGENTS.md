# DESIGN.md workflow (for AI agents)

Antigravity (and any agent that reads `AGENTS.md`): when the user asks to create, update, or audit a `DESIGN.md` (Google Stitch open format), follow this workflow. Do not author DESIGN.md by hand. The CLI does deterministic token extraction; **your job is the prose.**

The user has [`@creoit.com/design-md`](https://www.npmjs.com/package/@creoit.com/design-md) and [`@google/design.md`](https://github.com/google-labs-code/design.md) available via `npx`.

## Triggers

- **Create / generate / bootstrap** a DESIGN.md for a project that does not yet have one → init flow.
- **Update / refresh / sync** an existing DESIGN.md after code changes → update flow.
- **Audit** a DESIGN.md for drift → update flow with `--brief-only`.

If `DESIGN.md` is absent, default to **init**. If present, default to **update**.

## Init flow

1. Detect frameworks:
   ```bash
   npx @creoit.com/design-md detect
   ```
2. Generate scaffold + brief:
   ```bash
   npx @creoit.com/design-md init . --print-brief
   ```
3. Read the brief from stdout. It enumerates the eight canonical sections with per-section purpose, tokens to describe, and prompts.
4. Edit `DESIGN.md`. Replace every placeholder paragraph with real prose:
   - **Overview** — brand personality, audience, default stylistic choices.
   - **Colors** — per-token role and rationale; identify the single primary-action color.
   - **Typography** — per-family role; casing, weight, and letter-spacing rules.
   - **Layout** — grid model, base unit, containment.
   - **Elevation & Depth** — shadow / tonal / flat strategy.
   - **Shapes** — what the radius scale signals.
   - **Components** — variant behavior; load-bearing components.
   - **Do's and Don'ts** — 3–6 short rules; include WCAG AA contrast.
5. Validate:
   ```bash
   npx @google/design.md lint DESIGN.md
   ```
   Fix every error and warning.

## Update flow

1. Print the delta brief without modifying the file:
   ```bash
   npx @creoit.com/design-md update . --brief-only
   ```
2. If the delta is empty, stop and report. Do not edit.
3. Apply the token changes:
   ```bash
   npx @creoit.com/design-md update .
   ```
4. Revise only the prose sections the brief flagged. Leave the rest alone.
5. Validate:
   ```bash
   npx @google/design.md lint DESIGN.md
   ```

## Constraints

- The CLI is deterministic — never edit its output by hand.
- Never invent tokens that weren't extracted; ask the user or skip.
- Never reorder canonical sections: Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts.
- Preserve hand-authored `components`.
- Quote color hex strings (`"#RRGGBB"`) — the spec requires it.
