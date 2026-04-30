---
description: Generate a DESIGN.md from this codebase
---

You are running the **init** flow for a DESIGN.md.

1. Confirm what `@varunsat/design-md` detects:
   ```bash
   npx @varunsat/design-md detect
   ```
2. Run init with the brief:
   ```bash
   npx @varunsat/design-md init . --print-brief
   ```
3. Read the brief from stdout. It contains the eight canonical sections, the tokens each section should describe, and concrete prompts.
4. Edit `DESIGN.md` to replace every placeholder paragraph with real prose, guided by the brief. Cover:
   - Overview: brand personality, target audience, default stylistic choices.
   - Colors: role and rationale per token; which color is the *single* primary action.
   - Typography: per-family role, casing/weight/letter-spacing conventions.
   - Layout: grid model, base spacing unit, containment.
   - Elevation & Depth: shadow vs. tonal vs. flat; allowed combinations.
   - Shapes: what the radius scale signals.
   - Components: variant behavior; load-bearing components.
   - Do's and Don'ts: 3–6 short rules, including WCAG AA contrast.
5. Validate:
   ```bash
   npx @google/design.md lint DESIGN.md
   ```
   Fix every error and warning before reporting success.

Do not invent tokens that were not extracted. Do not reorder canonical sections.
