# Client Memory Graph — SPEC.md

## 1. Concept & Vision

A compounding knowledge layer for health coaches — every client interaction (workout, note, conversation) feeds into a unified memory graph that grows smarter over time. Rather than a coach asking "what do I know about this person?", they see it aggregated: progress trends, coaching observations, flagged concerns, and key facts surfaced in context.

This is NOT a general AI query system. It's a structured knowledge graph with a natural-language-style query interface, backed by connected data sources (DB + Discord messages + vault notes + questionnaire).

**Design metaphor:** A coach's mental model of a client — structured like a living notebook that organizes itself.

---

## 2. Design Principles

- **No RAG initially** — direct DB queries; the graph IS the knowledge base
- **Structured over semantic** — tags, types, timestamps beat embeddings for this use case
- **Compounding by default** — every coach note, workout session, and message auto-feeds the profile
- **Coach sees all** — access gated by coach→client relationship (org role or coachId)
- **Existing Habithletics untouched** — this feature lives in a new feature branch, new files only

---

## 3. Data Sources & Aggregation

### Connected Sources

| Source | What's pulled | How |
|---|---|---|
| Habithletics DB | Workouts, programs, sessions, meals, activities, goals | Direct Prisma queries |
| Discord messages | Coach↔client conversations | `Conversation` + `Message` models |
| Coach Notes (new) | Manual observations, injuries, preferences | `ClientNote` model |
| Client Tags (new) | Reusable labels (injury, concern, preference) | `ClientTag` + `ClientNoteTag` |
| Questionnaire (future) | Intake responses | Reserved field in `ClientProfile` |

### What the Profile Aggregates

- **Progress snapshot:** recent workout sessions, program assignments, activity streaks
- **Key facts:** tags (injury:ACL, prefers:barbell), pinned coach notes
- **Conversation summary:** last 5 Discord messages with timestamps
- **Coaching timeline:** all notes chronologically, filterable by tag

---

## 4. Database Schema Changes (prisma/schema.prisma)

```prisma
// ──────────────────────────────────────────────
// NEW: Coach Notes
// ──────────────────────────────────────────────

model ClientNote {
  id        String   @id @default(cuid())
  clientId  String   @map("client_id")        // FK → User.id
  authorId  String   @map("author_id")        // FK → User.id (coach who wrote it)
  content   String   @db.Text
  noteType  String   @default("general")      // "general" | "injury" | "observation" | "goal_update" | "concern"
  isPinned  Boolean  @default(false)          // Pinned = always visible at top
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  author   User           @relation(fields: [authorId], references: [id])
  client   User           @relation("ClientNotes", fields: [clientId], references: [id])
  tags     ClientNoteTag[]

  @@index([clientId, createdAt])
  @@map("client_notes")
}

model ClientTag {
  id        String   @id @default(cuid())
  name      String   @unique                      // e.g. "injury", "preference", "concern", "ACL", "sleep_issue"
  color     String   @default("#888888")          // hex color for UI
  createdAt DateTime @default(now()) @map("created_at")

  notes ClientNoteTag[]

  @@map("client_tags")
}

model ClientNoteTag {
  noteId String @map("note_id")
  tagId  String @map("tag_id")

  note ClientNote @relation(fields: [noteId], references: [id], onDelete: Cascade)
  tag  ClientTag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([noteId, tagId])
  @@map("client_note_tags")
}

// ──────────────────────────────────────────────
// EXTEND: User model (add relations)
// ──────────────────────────────────────────────

// In User model, add:
// notes       ClientNote[] @relation("ClientNotes")
// (no change to existing fields — only add relations)
```

### Prisma Migration Notes
- Run `npx prisma migrate dev --name add_client_memory_graph`
- New tables: `client_notes`, `client_tags`, `client_note_tags`
- No existing data affected — additive only

---

## 5. API Design

### Base Path: `/api/clients/[clientId]/`

#### `GET /api/clients/[clientId]/profile`
Aggregate full client profile (all sources merged).

**Auth:** Requester must be coach of this client (via `OrganizationMember.role ∈ {owner, trainer}` OR `User.coachId = requester.id`).

**Response:**
```ts
{
  client: { id, name, email, image }
  progress: {
    recentSessions: WorkoutSessionSummary[]   // last 5, with workout name + status
    programs: ProgramAssignmentSummary[]      // active programs
    activityStreak: { current, longest }
    recentMeals: MealSummary[]               // last 5
    goals: GoalSummary[]                     // active goals
  }
  notes: ClientNoteSummary[]                 // all notes, newest first
  tags: ClientTag[]                          // all tags used on this client
  conversations: ConversationSummary[]       // last 5 Discord messages
  pinnedFacts: ClientNote[]                  // isPinned = true notes
}
```

#### `GET /api/clients/[clientId]/notes`
List all notes for a client.

**Query params:** `?tag=injury&limit=20&offset=0&type=observation`

**Response:** `{ notes: ClientNote[], total: number }`

#### `POST /api/clients/[clientId]/notes`
Create a new coach note.

**Body:**
```ts
{
  content: string          // required, max 5000 chars
  noteType?: string        // "general" | "injury" | "observation" | "goal_update" | "concern"
  isPinned?: boolean
  tags?: string[]          // tag names to apply (creates if not exists)
}
```

**Response:** `ClientNote` object

#### `PATCH /api/clients/[clientId]/notes/[noteId]`
Update a note (author coach only).

**Body:** `{ content?, noteType?, isPinned?, tags? }`

#### `DELETE /api/clients/[clientId]/notes/[noteId]`
Delete a note (author coach only).

#### `GET /api/clients/[clientId]/query`
Natural-language-style query against client data.

**Query params:** `?q=How+is+Kevin+progressing`

**Implementation:** Pattern-matches keywords against structured data (see Section 7). Not a full LLM query — a smart router that maps intent to structured DB queries.

**Response:**
```ts
{
  answer: string            // human-readable answer
  sources: string[]         // e.g. ["workout_sessions", "client_notes"]
  data: {}                  // structured data backing the answer
}
```

#### `GET /api/clients/[clientId]/tags`
List all tags used on this client.

**Response:** `ClientTag[]`

---

## 6. File Structure (new files only)

```
ALPHA-EVOLVE/
  SPEC.md ← this file

prisma/
  schema.prisma            ← ADD: ClientNote, ClientTag, ClientNoteTag models

app/
  api/
    clients/
      [clientId]/
        profile/
          route.ts         ← GET aggregated profile
        notes/
          route.ts         ← GET list, POST create
          [noteId]/
            route.ts       ← PATCH update, DELETE
        query/
          route.ts         ← GET natural-language query
        tags/
          route.ts         ← GET client tags

components/
  coach/
    coach-notes-panel.tsx   ← Sidebar: list + quick-add notes
    client-profile-card.tsx ← Hero card: key facts + tags
    query-interface.tsx     ← "Ask about this client" chat UI
    note-editor.tsx         ← Note creation/editing form
    tag-badge.tsx           ← Colored tag pill
    client-memory-graph.tsx ← Main panel layout assembling above

app/
  trainer/
    clients/
      [id]/
        page.tsx            ← ENHANCED: tabs now include "Memory" tab
```

### All new files are isolated — zero modifications to existing files outside the trainer client detail page (which gets a new tab added).

---

## 7. Query Interface — Smart Keyword Router

Not a full LLM. A pattern-matching query router:

| Query pattern | Maps to | Response |
|---|---|---|
| `progress`, `how is`* progressing | `workoutSessions` + `goals` | Summary of recent activity |
| `injury`, `pain`, `hurt` | Filter notes by `noteType=injury` | List of injury-related notes |
| `concern`, `worry`, `issue` | Filter notes by `noteType=concern` | List of flagged concerns |
| `goals`, `what are.*goals` | `goals` table | Active goals |
| `recent`, `last`* | `workoutSessions` last 5 | Session list |
| `sleep`, `nutrition`, `diet` | Tag search `ClientNoteTag` | Notes tagged with these |
| `everything`, `summary` | Full profile | Complete profile snapshot |

**Fallback:** If no pattern matches, return: "I didn't understand that. Try asking about progress, injuries, goals, or concerns."

**Extensibility:** Each pattern is a function in `lib/jarvis/query-router.ts` — can add more patterns without touching the API route.

---

## 8. Component Specifications

### `coach-notes-panel.tsx`
- **Props:** `clientId: string, clientName: string`
- **Features:**
  - Scrollable note list (newest first), grouped by date
  - Each note shows: author avatar, content preview (truncated 120 chars), type badge, tags, pin indicator, time ago
  - Click to expand full note inline
  - "Add Note" button → opens `note-editor.tsx` as inline form at top
  - Filter pills: All | Injury | Concern | Observation | Pinned
  - Real-time: fetches on mount, mutations invalidate + refetch

### `client-profile-card.tsx`
- **Props:** `profile: ClientProfile` (from `/api/clients/[clientId]/profile`)
- **Features:**
  - Client avatar + name + email header
  - Pinned facts section (pinned notes as collapsible items)
  - Tag cloud: all tags with colors
  - Quick stats: current streak, active programs, last session date
  - "Ask about this client" button → opens `query-interface.tsx`

### `query-interface.tsx`
- **Props:** `clientId: string`
- **Features:**
  - Single input field with placeholder: "Ask about this client..."
  - Submit on Enter
  - Answer displayed as a styled card below input
  - "Sources" shown as small badges
  - Loading state while fetching
  - Empty state when no query yet

### `note-editor.tsx`
- **Props:** `clientId: string, note?: ClientNote, onSave: () => void, onCancel: () => void`
- **Features:**
  - Textarea (min 3 rows, max 20)
  - Note type selector (radio buttons styled as pills)
  - Tag multi-select (existing tags shown, type to create new)
  - Pin toggle
  - Save / Cancel buttons
  - Inline validation (content required, max 5000 chars)

### `tag-badge.tsx`
- **Props:** `tag: ClientTag, size?: "sm" | "md", onRemove?: () => void`
- **Features:**
  - Colored dot + tag name
  - Optional X button for removal
  - Sizes: sm (text-xs) / md (text-sm)

### `client-memory-graph.tsx`
- **Props:** `clientId: string, clientName: string`
- **Layout:** Two-column on desktop, stacked on mobile
  - **Left:** `client-profile-card.tsx` (fixed width ~340px)
  - **Right:** Tabbed area — Notes | Query | Progress
- **Behavior:** All sections load independently via their own API calls

### Enhanced `trainer/clients/[id]/page.tsx`
- Add new tab: **"Memory"**
- Renders `<ClientMemoryGraph clientId={id} clientName={...} />`
- All other tabs remain unchanged

---

## 9. Auth & Authorization

- All `/api/clients/[clientId]/` routes check:
  1. User is authenticated (via `requireAuth()`)
  2. User is in same organization as client with role `owner | trainer`; OR
  3. User is the client's coach (`client.coachId === user.id`)
- Return `403 Forbidden` if neither condition holds
- Notes can only be edited/deleted by their author (`authorId === user.id`)

---

## 10. Implementation Phases

### Phase 1: Foundation
- Add Prisma models + migrate
- `GET /api/clients/[clientId]/profile` route
- `GET|POST /api/clients/[clientId]/notes` route
- `PATCH|DELETE /api/clients/[clientId]/notes/[noteId]` route

### Phase 2: UI Shell
- `coach-notes-panel.tsx` (read-only list)
- `note-editor.tsx`
- Enhanced trainer client detail page with Memory tab

### Phase 3: Query Interface
- `query-interface.tsx`
- `GET /api/clients/[clientId]/query` route + query router lib

### Phase 4: Polish
- `client-profile-card.tsx` with pinned facts
- Tag management (`GET /api/clients/[clientId]/tags`)
- `client-memory-graph.tsx` full layout
- Loading skeletons, error boundaries

---

## 11. What's NOT in Scope

- Full LLM/NLP query processing (no OpenAI/Anthropic calls in v1)
- RAG pipeline
- Client-facing UI (coach-only feature)
- Discord message fetching from external API (uses existing DB Conversation model)
- Questionnaire intake integration (reserved for future)
- Modifying existing workout/meal/activity CRUD

---

## 12. Technology Choices

- **Framework:** Next.js 14 App Router (existing)
- **Database:** PostgreSQL via existing Prisma setup
- **Auth:** Existing `requireAuth()` helper (Clerk)
- **Styling:** Existing shadcn/ui component library
- **State:** React `useState`/`useEffect` (no additional state lib needed)
- **Data fetching:** Native `fetch` with Next.js server components where appropriate
- **No new dependencies** — only Prisma schema changes
