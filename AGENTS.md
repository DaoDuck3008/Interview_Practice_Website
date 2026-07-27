# Repository Agent Rules

This repository is an npm-workspaces monorepo for an IT interview-practice product.

## Mandatory Context

Before making code changes, always read the relevant agent rule files for the
area being touched:

- Always read this root `AGENTS.md` first.
- When touching `apps/web`, read `apps/web/AGENTS.md` before editing.
- When touching `apps/api`, read `apps/api/AGENTS.md` before editing.
- When a task touches both apps, read both app-level files before editing.

After reading, follow the most specific rule that applies. App-level rules
override this root file for their own code areas.

## Workspace Shape

- `apps/web`: Next.js frontend.
- `apps/api`: NestJS API.

## General Workflow

- Inspect existing code before changing it.
- Keep edits scoped to the user's request.
- Do not revert unrelated user changes.
- Prefer existing project patterns, helpers, and utilities.
- Add comments only when they clarify non-obvious behavior.
- Keep user-facing Vietnamese text with correct accents.

## Verification

Run the smallest useful validation after changes:

- Frontend changes: `npm run lint` from `apps/web`; use `npm run build` when
  touching routing, shared types, or production-sensitive code.
- API changes: use the checks documented in `apps/api/AGENTS.md`.

If a command fails because the sandbox cannot reach external services, retry
with an explicit approval request instead of treating it as a code failure.
