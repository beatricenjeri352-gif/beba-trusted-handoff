---
name: repository-maintenance
description: Maintain Beba's repository structure, documentation links, Git workflow, and static prototype. Use when restructuring directories, updating docs, validating prototype changes, or preparing commits.
---

# Repository Maintenance

## Core rules

- Work on the active feature branch; do not commit directly to `main`.
- Keep prototype source under `prototype/`.
- Keep product and technical documents under the numbered `docs/` directories.
- Do not commit secrets, environment files, build output, or editor settings.
- Preserve the prototype's behavior when reorganizing files.

## Documentation structure

- `docs/01-product/` — user journeys and product context
- `docs/02-decisions/` — decision records
- `docs/03-product-specifications/` — pricing and payment rules
- `docs/04-technical-design/` — architecture, API, and database design
- `docs/05-security/` — privacy, security, and incident handling
- `docs/06-testing/` — testing and acceptance criteria
- `docs/07-launch/` — pilot launch planning

## Before changing structure

1. Run `git status --short --branch`.
2. Use `git mv` for file and directory moves.
3. Search for old paths after moves.
4. Update `docs/documentation-index.md` and relative links.
5. Run `git diff --check` and review `git diff --stat`.

## Prototype validation

- Open `prototype/index.html` locally in a browser.
- Verify sender, carrier, receiver-link, profile, and trust screens.
- Verify every pickup/drop-off flow and browser-only demo behavior.
- Do not imply that the prototype is production functionality.
