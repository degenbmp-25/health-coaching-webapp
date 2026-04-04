# Evolution Log - Jarvis Intelligence Layer

## Started
- Date: 2026-04-04
- Branch: feat/jarvis-intelligence
- Goal: Build Health Coaching Jarvis inside Habithletics

## Loop 0: Initialization
- Created requirements.md
- Spawning Architect agent

---

## Builder Agent: Client Memory Graph Implementation

**Date:** 2026-04-04
**Status:** ✅ Complete (Phase 1-4 implemented)

### Files Created

#### Prisma Schema
- `prisma/schema.prisma` — **MODIFIED** — Added `ClientNote`, `ClientTag`, `ClientNoteTag` models to existing User model
- `prisma/migrations/20260404000000_add_client_memory_graph/migration.sql` — New migration (3 new tables)
- `prisma/migrations/20260404000000_add_client_memory_graph/migration_lock.toml` — Migration lock file

#### API Routes (5 routes)
- `app/api/clients/[clientId]/profile/route.ts` — GET aggregated full client profile from all sources
- `app/api/clients/[clientId]/notes/route.ts` — GET list (with filtering) + POST create notes
- `app/api/clients/[clientId]/notes/[noteId]/route.ts` — PATCH update + DELETE notes (author-only)
- `app/api/clients/[clientId]/query/route.ts` — GET keyword-router query interface (8 patterns)
- `app/api/clients/[clientId]/tags/route.ts` — GET all tags for a client

#### Coach Components (6 components)
- `components/coach/tag-badge.tsx` — Colored tag pill with optional remove button (sm/md sizes)
- `components/coach/note-editor.tsx` — Full note creation/editing form (textarea, type selector, tag multi-select, pin toggle)
- `components/coach/coach-notes-panel.tsx` — Scrollable sidebar with note list, filter pills, date grouping, inline expand/edit/delete
- `components/coach/client-profile-card.tsx` — Hero card with avatar, stats, pinned facts, tag cloud
- `components/coach/query-interface.tsx` — Natural-language-style query input with answer card + source badges
- `components/coach/client-memory-graph.tsx` — Two-column layout assembling all components; tabbed right panel (Notes | Query | Progress)

#### Enhanced Existing File
- `app/trainer/clients/[id]/page.tsx` — **MODIFIED** — Added "Overview" + "Memory" tabs via shadcn Tabs component

### Key Implementation Details

- **Auth:** All routes check org role (`owner|trainer`) OR coachId/primaryTrainerId relationship
- **Notes:** Author-only edit/delete (authorId check)
- **Tags:** Auto-created on note save via upsert (`ClientTag.upsert`)
- **Query router:** 8 keyword patterns covering progress, injuries, concerns, goals, recent sessions, sleep/nutrition, summary — no LLM required
- **Prisma validation:** ✅ Passed (`npx prisma validate`)
- **Migration:** Created manually (non-interactive environment); run `prisma migrate deploy` or `prisma migrate dev` in interactive mode to apply

### Loop 1: Bug Fixes (2026-04-04)

**Status:** ✅ All CRITICAL and HIGH issues resolved

#### Files Modified

**`app/api/clients/[clientId]/profile/route.ts`**
- Fixed longest streak calculation: added `longestStreak = Math.max(longestStreak, streak)` in the `else` branch (gap > 1 day) before resetting `streak = 1`. Previously, non-consecutive date patterns would produce wrong (too-low) streak values because longestStreak was only updated on `diff === 1`.

**`app/api/clients/[clientId]/notes/route.ts`**
- Fixed `where: any` type bypass: replaced untyped `const where: any = { clientId }` with a properly inferred `const where: Parameters<typeof db.clientNote.findMany>[0]["where"] = { clientId }` and added `noteQuerySchema` Zod validator for query params. Invalid `noteType` values now return 400 with a client-safe error shape.
- Added pagination validation: `limit` capped at 1–100, `offset` capped at 0–10000 via `z.string().transform(...).pipe(z.number().int().min/max)`. NaN and out-of-range values return 400 instead of silently failing.
- Fixed tag color inconsistency: server now generates a deterministic color from tag name (hash mod palette size) on `ClientTag.create`. Client-side note-editor.tsx uses the same deterministic algorithm so optimistic UI always matches the server response. No more gray vs blue mismatch.

**`components/coach/coach-notes-panel.tsx`**
- Fixed expanded note state leak: `handleSaved()` and `handleCancel()` now call `setExpandedNoteId(null)` to clear the expanded state after editing a note. Previously, the note would remain visually expanded (showing Edit/Delete buttons) after the inline editor closed.

**`app/api/clients/[clientId]/query/route.ts`**
- Fixed unbounded nutrition/diet query: added `take: 50` to `db.clientNote.findMany` inside the `sleep|nutrition|diet|meal` pattern to cap results at 50 rows instead of full table scan.
- Fixed missing query length validation: added server-side check rejecting queries > 500 chars with a 400 error before any DB access.

#### What's Working
- All API routes implemented with full error handling and Zod validation
- All UI components implemented with loading states, error boundaries, and skeleton loaders
- Trainer client detail page enhanced with Memory tab (Overview tab unchanged)
- Tag creation inline in note editor
- Note expand/edit/delete inline in coach-notes-panel
