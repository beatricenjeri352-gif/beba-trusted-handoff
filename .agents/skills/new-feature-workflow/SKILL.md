---
name: new-feature-workflow
description: "Use when planning or implementing a new feature or epic in the Beba Next.js web app (marketing site, tenant portal, admin, Supabase), working story by story on branches cut from an epic branch."
---

# New Feature Workflow

Use this workflow to deliver a requested feature end to end in the Beba web app (Next.js App Router, Tailwind, Supabase). Follow the repository's current code and conventions; do not assume documentation or older feature lists perfectly describe the present implementation.

## Epics and stories

Work is split into **stories**. The epic is a long-lived branch; each story is a short-lived branch cut from it.

- **Epic branch:** the branch the user names as the epic (for example `feature/rebrand_website`). It is cut from `dev` and merges back to `dev` once, when all stories are done. Never commit directly to it; it only receives story merges.
- **Story branch:** `<PREFIX>_<AREA>_<short_name>` cut from the epic, for example `BE_HERO_section`, `BE_FEATURES_section`, `BE_TESTIMONIALS_removal`. One story is one reviewable slice (typically one section, page, or migration). Older epics used `KI-US3-category-table` style; follow whichever style the current epic already uses.
- Merge each finished story back into the epic via PR (base = epic branch), then start the next story from the updated epic.
- Each story ends with its own docs update and checks, so the epic is always shippable.

## Workflow

1. **Branch first**
   - Never write code on `main`, and never directly on `dev` or the epic branch.
   - Run `git fetch`, confirm the epic branch is up to date, then create the story branch from it. If the current branch is `main`, or the story branch does not exist yet, stop and create the correct branch before editing files.
   - Check `git status` first so unrelated untracked files are not swept into the story.

2. **Understand the story and its boundaries**
   - Identify the user-facing behavior, entry point, expected states, and acceptance criteria. Write them down as the story's definition of done.
   - Read the root `CLAUDE.md`, plus the relevant parts of `AGENTS.md` and `README.md`, before deciding where code belongs.
   - Keep the change limited to the story. Do not add adjacent work; note it as a candidate for a later story. Ask a focused question only when an unresolved product decision would materially change the implementation.

3. **Trace the existing flow**
   - Find the closest existing page or component and reuse its patterns rather than creating a parallel architecture.
   - Layout: `app/(marketing)/[locale]/` is the public site (landing sections in `components/landing/`, shared UI in `components/ui/`); `app/(portal)/` is the tenant portal; `app/admin/`, `app/insights/`, `app/manufacturer/` are the other authed areas. Data access lives in `services/` and `lib/`, Supabase schema in `supabase/migrations/`.
   - Marketing styling is scoped under `.mktg` in `app/globals.css` and must not leak into the portal. Reuse its utilities (`container-tight`, `eyebrow`, `accent-dot`, `serif-italic`, `card-clean`) and tokens before adding new ones. See `Beba-Insights-Theme-Guide.md` for the portal theme.
   - Marketing copy is currently hard-coded English in the components even though the route is `[locale]`; do not half-translate a section. Only touch `messages/en.json` / `messages/de.json` if the story is explicitly about localisation.
   - When a section is added, removed, or reordered, update everything that points at it: `app/(marketing)/[locale]/page.tsx`, the anchor links in `components/landing/Navbar.tsx` and `Footer.tsx`, and any `id` the anchors target.

4. **Plan the smallest complete implementation**
   - Decide which layers are really needed: page/component, service, migration, edge function, docs. Prefer editing existing components over adding new ones.
   - Preserve existing auth, loading/error/empty states, and tenant isolation. Surface failures with the project's established error handling; never turn a failure into silent success.
   - Avoid new dependencies and abstractions unless the story requires them.
   - Removing a section: unhook it from the page and nav. Delete its file only if the user asked for deletion, otherwise leave it so it is easy to restore.

5. **Implement**
   - Server components by default; add `"use client"` only for state, effects, or framer-motion. Match the existing component style (named exports, Tailwind classes, lucide-react icons).
   - Respect accessibility and responsiveness: semantic headings in order, alt text or `aria-label`s, usable at mobile widths, and `prefers-reduced-motion` for animation.
   - Schema changes: inspect the latest file in `supabase/migrations/` and add a new, correctly ordered migration with RLS policies and grants for new tables. Do not apply migrations to a hosted project unless explicitly asked. Never hardcode credentials or keys.
   - Marketing claims must be true. Do not invent statistics, user counts, quotes, or features that do not exist.

6. **Verify**
   - Run from the repo root: `npm run lint`, `npx tsc --noEmit`, and `npm run build` when routes or imports changed. There is no unit test runner for the UI; the existing `tests/` are matching smoke tests for SQL and the matching pipeline, so run them only if the story touches matching.
   - For UI stories, start `npm run dev` and look at the page at desktop and mobile widths, including in-page anchor navigation. If you cannot view it in a browser, say so rather than claiming it works.
   - If the story includes a migration, review the SQL and docs together; do not claim a hosted migration was verified unless it was applied in an authorized environment.

7. **Document, review, and report**
   - Update `AGENTS.md` and `README.md` in the same story, not afterwards: section order, component tables, route tables, and anything else the change makes stale.
   - Check the final diff for unrelated changes, dead imports, broken anchors, and stale docs.
   - Commit messages: concise, imperative, no `Co-Authored-By` trailer and no tool or assistant attribution. Commit on the story branch only when asked, and open the PR against the epic branch.
   - Summarize the user-visible change, the files touched, and the exact validation commands with their results. Clearly call out any checks that could not be run.