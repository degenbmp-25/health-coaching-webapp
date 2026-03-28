# SPEC.md — Google Sheets Live Workout Integration

## Project: habithletics-redesign-evolve
## Phase: Alpha-Evolve Loop 2 (Architect → Builder → Reviewer → Evolve)

---

## 1. Overview

Integrate the Google Sheets-based live workout page from `habithletics-evolve` into `habithletics-redesign-evolve`. The target page (`app/dashboard/workouts/page.tsx`) is currently a static workout management page backed by a database. The goal is to replace it with a live, sheets-driven workout experience that pulls workout data from a published Google Sheet CSV and logs sets to localStorage.

---

## 2. Source Analysis

### habithletics-evolve (Source)

**`lib/sheets.ts`** — 4 key exports:
- `fetchWorkouts()` → `Promise<Workout[]>` — fetches & parses published Google Sheet CSV with 10s timeout + AbortController
- `saveLog(log)` → saves WorkoutLog to localStorage (`workout_logs` key), handles `QuotaExceededError`
- `getLogs()` → `WorkoutLog[]` — reads from localStorage, handles corruption
- `getLogForExercise(exerciseId, date)` → finds single log entry

**`app/page.tsx`** — Full "Today's Workout" page:
- Workout selector (A-E tabs)
- Exercises grouped by category
- Per-set weight/reps input fields
- Completion tracking (progress bar + per-exercise mark-complete)
- Video placeholder display
- ErrorCard on failure with retry
- WorkoutSkeleton on loading
- AuthGuard wrapping entire page

**Design:** Custom CSS with `.container`, `.header`, `.workout-selector`, `.exercise-card`, etc. — NOT using shadcn/Tailwind.

---

### habithletics-redesign-evolve (Target)

**Design system:** CSS variables (HSL), Tailwind classes, shadcn/ui components, dark mode via `.dark` class.

**Existing relevant components:**
| Component | Path | Used for |
|---|---|---|
| `ErrorCard` | `components/ui/error-card.tsx` | Error display with retry |
| `WorkoutSkeleton` | `components/workout/workout-skeleton.tsx` | Loading skeleton (card-based) |
| `WorkoutListSkeleton` | `components/workout/workout-list-skeleton.tsx` | List skeleton |
| `Shell` | `components/layout/shell.tsx` | Page wrapper grid |
| `DashboardHeader` | `components/pages/dashboard/dashboard-header.tsx` | Page header with actions |
| `WorkoutSessionView` | `components/workout/workout-session-view.tsx` | Existing DB-backed session view |
| `EmptyPlaceholder` | `components/empty-placeholder.tsx` | Empty states |
| `Badge`, `Button`, `Card`, `Input`, `Progress` | `components/ui/*` | Core UI primitives |

**Auth:** Clerk via `getCurrentUser()` in `lib/session.ts` — returns `null` if not authenticated.

**Existing page pattern:** `app/dashboard/workouts/page.tsx` uses `Shell` + `DashboardHeader` + `WorkoutList` (DB-backed).

**Routing:**
- `/dashboard/workouts` → workout management list (DB)
- `/dashboard/workouts/[workoutId]` → individual DB-backed workout session view

---

## 3. Implementation Plan

### 3.1 Copy `lib/sheets.ts`
**Source:** `~/BeastmodeVault/vault/projects/habithletics-evolve/lib/sheets.ts`  
**Target:** `~/BeastmodeVault/vault/projects/habithletics-redesign-evolve/lib/sheets.ts`

No modifications needed. The types (`Workout`, `Exercise`, `WorkoutLog`) are compatible with the target. The CSV parsing logic is self-contained.

### 3.2 Create `components/workout/sheets-workout-view.tsx` (NEW)
**Purpose:** Client component that renders the live sheets-driven workout experience.

**Responsibilities:**
- Fetch workouts via `fetchWorkouts()` on mount with 10s timeout
- Display loading state using `WorkoutSkeleton`
- Display error state using `ErrorCard` with retry callback
- Render workout selector (A-E tabs) matching the source behavior
- Group exercises by `category` field
- Per-set weight/reps inputs with localStorage persistence via `saveLog`/`getLogs`
- Progress bar (completed sets / total sets)
- Completion toggle per exercise
- Video placeholder display

**Key design adaptations vs source:**
- Replace custom `.container`, `.exercise-card` CSS with Tailwind + shadcn components
- Use `Card`, `Badge`, `Button`, `Input`, `Progress` from shadcn
- Category headers: `<div className="flex items-center gap-2"><div className="h-1 w-4 rounded-full bg-primary" /><h3 className="text-sm font-semibold uppercase tracking-wider text-primary">{category}</h3></div>`
- Exercise cards: use `Card` with inner padding, exercise number as a styled badge
- Sets: use `Input` components in a grid layout (matching `WorkoutSessionView` pattern)
- Progress: use shadcn `Progress` component
- Completion button: styled with check icon (like source)

**Auth:** Wrap with `getCurrentUser()` in the parent page (server component), not inside this component.

### 3.3 Modify `app/dashboard/workouts/page.tsx`
**Current:** Server component that fetches DB workouts and renders `WorkoutList`.  
**Change to:** Two-mode page:
1. **Primary mode:** Live sheets workout experience (A-E selector, full logging)
2. **Secondary link:** Link to DB-backed workout management (existing `WorkoutList`)

**New structure:**
- Check `NEXT_PUBLIC_SHEET_CSV_URL` env var
- If set → render `SheetsWorkoutView` client component inside `Shell`
- If not set → fallback to existing `WorkoutList` behavior
- Auth protection via `getCurrentUser()` + redirect

### 3.4 Optional: Modify `components/workout/workout-item.tsx`
No changes needed. `WorkoutItem` is DB-backed and used in `WorkoutList` for the management view. The sheets view is a separate component.

### 3.5 Optional: Create `app/dashboard/workouts/live/page.tsx`
**Purpose:** Dedicated route for the live sheets workout experience.  
**Pattern:** Can act as a dedicated "Today's Workout" shortcut while the main `/workouts` page remains the DB management view.

---

## 4. Design System Alignment

### Color Palette (CSS Variables)
```
--primary: 240 72.2% 50.6% (blue-ish, light) / 0 72.2% 50.6% (red, dark)
--destructive: 0 84.2% 60.2% (light) / 0 62.8% 30.6% (dark)
--muted: 240 4.8% 95.9% (light) / 0 0% 14.9% (dark)
--background: 0 0% 100% (light) / 0 0% 3.9% (dark)
--foreground: 240 10% 3.9% (light) / 0 0% 98% (dark)
```

### Typography
- Font: Inter (via next/font/google)
- Headings: `text-2xl font-bold` to `text-3xl font-bold`
- Body: default antialiased

### Spacing & Layout
- Container: `px-4 sm:px-6 md:px-0` (Shell component)
- Cards: `p-5` inner padding, `rounded-lg` borders
- Sections: `space-y-6` between major blocks

### Component Mapping (Source → Target)
| Source CSS Class | Target Implementation |
|---|---|
| `.container` | `Shell` wrapper + `max-w-4xl mx-auto` |
| `.header` | `DashboardHeader` + manual progress section |
| `.workout-selector` | Custom flex row of `Button` (ghost/default) |
| `.selector-btn` | `Button` variant toggle (active = default, inactive = ghost) |
| `.exercise-card` | `Card` with conditional `border-primary/50 bg-primary/5` |
| `.exercise-header` | Flex row with number badge + title + meta |
| `.sets-container` | Vertical stack of set rows, each with `Input` grid |
| `.complete-btn` | `Button` with check icon, full width |
| `.tempo-badge` | `Badge` variant secondary |
| `.progress-bar` | shadcn `Progress` component |
| `.empty-state` | `EmptyPlaceholder` |
| `ErrorCard` (component) | `components/ui/error-card.tsx` |
| `WorkoutSkeleton` (component) | `components/workout/workout-skeleton.tsx` |

---

## 5. Auth Integration

**Approach:** Server-component auth pattern (matching existing redesign architecture).

```tsx
// app/dashboard/workouts/page.tsx
export default async function WorkoutsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/signin")
  // ... render
}
```

No `AuthGuard` wrapper component needed (unlike the source). The server component handles redirect before any client component renders.

---

## 6. Error Handling Strategy

| Scenario | Handling |
|---|---|
| Fetch timeout (>10s) | `ErrorCard` with "Request timed out" message + retry |
| Fetch HTTP error | `ErrorCard` with status message + retry |
| Empty sheet (0 workouts) | `EmptyPlaceholder` with "No workouts found" |
| localStorage unavailable | `saveLog`/`getLogs` catch `DOMException` silently, logs to console |
| localStorage corrupted | `getLogs` catches JSON parse error, returns `[]` |
| Network offline | Page loads from cache (Next.js default), logging silently fails |

**Retry flow:** `ErrorCard` accepts `onRetry` prop which re-calls `fetchWorkouts()`. The retry function is captured in the error state closure (same pattern as source).

---

## 7. File-by-File Breakdown

### New Files
| File | Purpose | Type |
|---|---|---|
| `lib/sheets.ts` | Google Sheets fetch + localStorage log persistence | Library |
| `components/workout/sheets-workout-view.tsx` | Client component — full live workout UI | Client Component |

### Modified Files
| File | Change | Risk |
|---|---|---|
| `app/dashboard/workouts/page.tsx` | Replace DB-list with sheets view, add env check | Medium — existing file |
| `app/dashboard/workouts/error.tsx` | Ensure error boundary exists | Low |

### No Changes Needed
- `components/ui/error-card.tsx` — already compatible
- `components/workout/workout-skeleton.tsx` — already compatible  
- `components/layout/shell.tsx` — already compatible
- `components/pages/dashboard/dashboard-header.tsx` — already compatible
- `lib/session.ts` — already used for auth

### Optional
| File | Change |
|---|---|
| `app/dashboard/workouts/live/page.tsx` | Dedicated live workout route |

---

## 8. Environment Variables

| Variable | Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_SHEET_CSV_URL` | Must be set in Vercel | Already exists from habithletics-evolve deployment |

**CSV URL format:** `https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pub?output=csv`

---

## 9. Data Flow

```
User visits /dashboard/workouts
        ↓
Server component: getCurrentUser() → redirect if null
        ↓
SheetsWorkoutView mounts (client)
        ↓
fetchWorkouts() → Google Sheets CSV → parseCSV() → Workout[]
        ↓
User selects workout (A-E)
        ↓
Exercises grouped by category displayed
        ↓
User inputs weight/reps per set
        ↓
saveLog() → localStorage['workout_logs']
        ↓
User marks exercise complete
        ↓
Progress bar updates (completedSets / totalSets)
```

---

## 10. Key Implementation Notes

1. **Client component boundary:** `SheetsWorkoutView` must be `"use client"` because it uses `useState`, `useEffect`, and localStorage.

2. **Server → Client data passing:** The server component (`page.tsx`) passes no props — the client component fetches data independently. This keeps the architecture clean.

3. **No conflict with DB-backed workout:** The sheets view is a completely separate data source. The existing `WorkoutSessionView` (DB-backed) remains at `/dashboard/workouts/[workoutId]` for admin workout management.

4. **localStorage key:** `workout_logs` (consistent with source). No namespacing by user needed since Clerk auth gates the page.

5. **Vercel deployment:** No build changes needed. `lib/sheets.ts` has no server-only code. All sheets/network calls happen client-side.

6. **AbortController:** 10s timeout on `fetchWorkouts()` prevents hanging requests. Clear timeout in both success and error paths.

---

## 11. Success Criteria Checklist

- [ ] `lib/sheets.ts` copied and exports `fetchWorkouts`, `saveLog`, `getLogs`, `getLogForExercise`
- [ ] `SheetsWorkoutView` renders workout selector (A-E)
- [ ] Exercises display grouped by category with sets/reps/tempo/rest
- [ ] Per-set weight/reps inputs persist to localStorage
- [ ] Completion toggle updates progress
- [ ] `WorkoutSkeleton` shows during initial load
- [ ] `ErrorCard` shows on fetch failure with retry
- [ ] `EmptyPlaceholder` shows if sheet returns 0 workouts
- [ ] Auth: unauthenticated users redirected to `/signin`
- [ ] Design matches redesign system (Tailwind, shadcn, dark mode)
- [ ] Builds and deploys to Vercel
