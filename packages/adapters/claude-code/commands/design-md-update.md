---
description: Update an existing DESIGN.md to match the current codebase
---

You are running the **update** flow for a DESIGN.md.

1. Print the delta brief without writing yet:
   ```bash
   npx @varunsat/design-md update . --brief-only
   ```
2. If the diff is empty, stop and report "no changes" — do not edit the file.
3. Apply the token diff to the file:
   ```bash
   npx @varunsat/design-md update .
   ```
   This rewrites the YAML front matter only, preserving the body and any hand-authored `components`.
4. Read the brief from step 1. For each section flagged as **Updates needed**, revise the prose so it accurately describes the new token values. Leave untouched sections alone.
5. Validate:
   ```bash
   npx @google/design.md lint DESIGN.md
   npx @google/design.md diff <previous-DESIGN.md-from-git> DESIGN.md
   ```
   Fix every error and warning before reporting success.

Do not invent tokens. Do not change canonical section order. Preserve `components` unless explicitly asked otherwise.
