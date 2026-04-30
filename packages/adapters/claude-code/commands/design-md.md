---
description: Create or update a DESIGN.md for this project (auto-detects)
---

You are running the **DESIGN.md** workflow. Decide the flow up front:

- If `DESIGN.md` does **not** exist at the repo root → run the **init** flow.
- If `DESIGN.md` **does** exist → run the **update** flow.

Announce which one you picked before running anything.

## Init flow (no DESIGN.md yet)

1. Confirm what `@creoit.com/design-md` detects:
   ```bash
   npx @creoit.com/design-md detect
   ```
   If no frameworks are detected on a clearly web-app project, ask the user where styling lives before continuing.
2. Generate scaffold + brief in one step:
   ```bash
   npx @creoit.com/design-md init . --print-brief
   ```
   This writes a `DESIGN.md` (YAML front matter from extracted tokens + placeholder prose) and prints the agent brief to stdout.
3. Read the brief carefully. Per section it lists: the spec's purpose, the tokens to describe, and concrete prompts.
4. Edit `DESIGN.md` and replace each placeholder paragraph with real prose:
   - **Overview** — brand personality, audience, default stylistic choices (2–3 sentences). Then explicitly cover **product identity**: app name, tagline / one-line description, logo (where it appears, allowed forms, minimum sizes, clear-space rules).
   - **Colors** — per-token role and rationale; identify the *single* primary-action color.
   - **Typography** — per-family role; casing, weight, letter-spacing rules.
   - **Layout** — grid model, base spacing unit, containment.
   - **Elevation & Depth** — shadow / tonal / flat strategy.
   - **Shapes** — what the radius scale signals.
   - **Components** — **be exhaustive**: enumerate every component the product uses, grouped by category. For each, write what it is, when it's used, which tokens it pulls from, and its variants/states.
     - **Identity & chrome**: Header (logo + nav + primary action), Footer (links, copyright, social), App name, Tagline, Page Title, Page Subtitle, Section header.
     - **Actions**: Primary / Secondary / Tertiary / Destructive button, Icon button, Link button — cover hover / focus / pressed / disabled.
     - **Inputs**: Text input, Text area, Select, Combobox, Checkbox, Radio, Switch, Slider, Date picker — cover label / placeholder / helper / error.
     - **Containers**: Card, Panel, Modal, Drawer / Sheet, Dialog, Popover.
     - **Navigation**: Top nav, Side nav, Breadcrumbs, Tabs, Pagination, Stepper.
     - **Feedback**: Tooltip, Toast, Alert / Banner, Badge, Tag / Chip, Progress (bar + spinner), Skeleton.
     - **Data display**: List item, Table row, Column header, Divider, Avatar, Empty state, Stat card.

     Then encode the most important of these as concrete `components:` entries in the YAML front matter — e.g. `header`, `footer`, `button-primary`, `button-primary-hover`, `card-default`, `text-input`, `tooltip`. Use token references (`{colors.primary}`, `{rounded.md}`, etc.) for the values.
   - **Do's and Don'ts** — 3–6 short rules. Include a WCAG AA contrast rule.

## Update flow (DESIGN.md already exists)

1. Print the delta brief without modifying the file:
   ```bash
   npx @creoit.com/design-md update . --brief-only
   ```
2. If the diff is empty, stop and report "no changes". Do not edit the file.
3. Apply the token diff to the file (rewrites the YAML front matter, preserves the body and any hand-authored `components`):
   ```bash
   npx @creoit.com/design-md update .
   ```
4. Revise only the prose sections the brief flagged as **Updates needed**. Leave untouched sections alone.

## Validation (both flows)

Run the official linter and fix every error and warning before reporting success:

```bash
npx @google/design.md lint DESIGN.md
```

For updates, also diff against the previous version (if available in git):

```bash
npx @google/design.md diff <previous-DESIGN.md> DESIGN.md
```

## Constraints

- The CLI is deterministic — never patch its YAML output by hand.
- Never invent tokens that weren't extracted; ask the user or skip.
- Never reorder canonical sections: Overview → Colors → Typography → Layout → Elevation & Depth → Shapes → Components → Do's and Don'ts.
- Preserve hand-authored `components` unless explicitly asked otherwise.
- Quote color hex strings (`"#RRGGBB"`) — the spec requires it.
