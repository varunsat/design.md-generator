---
description: Generate a DESIGN.md from this codebase
---

You are running the **init** flow for a DESIGN.md.

1. Confirm what `@creoit.com/design-md` detects:
   ```bash
   npx @creoit.com/design-md detect
   ```
2. Run init with the brief:
   ```bash
   npx @creoit.com/design-md init . --print-brief
   ```
3. Read the brief from stdout. It contains the eight canonical sections, the tokens each section should describe, and concrete prompts.
4. Edit `DESIGN.md` to replace every placeholder paragraph with real prose, guided by the brief. Cover:
   - Overview: brand personality, target audience, default stylistic choices. Plus product identity — app name, tagline, logo placement and rules.
   - Colors: role and rationale per token; which color is the *single* primary action.
   - Typography: per-family role, casing/weight/letter-spacing conventions.
   - Layout: grid model, base spacing unit, containment.
   - Elevation & Depth: shadow vs. tonal vs. flat; allowed combinations.
   - Shapes: what the radius scale signals.
   - Components: **enumerate every component the product uses** — Identity & chrome (Header, Footer, App name, Page Title/Subtitle), Actions (buttons, icon buttons), Inputs (text, select, checkbox, radio, switch), Containers (Card, Modal, Drawer), Navigation (Top/Side nav, Tabs, Breadcrumbs, Pagination), Feedback (Tooltip, Toast, Alert, Badge, Progress), Data display (List, Table, Avatar, Empty state). For each: purpose, tokens it uses, variants and states. Then add concrete `components:` YAML entries for the load-bearing ones (e.g. `header`, `button-primary`, `card-default`).
   - Do's and Don'ts: 3–6 short rules, including WCAG AA contrast.
5. Validate:
   ```bash
   npx @google/design.md lint DESIGN.md
   ```
   Fix every error and warning before reporting success.

Do not invent tokens that were not extracted. Do not reorder canonical sections.
