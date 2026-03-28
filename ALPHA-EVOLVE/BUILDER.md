# BUILDER.md — Google Sheets Integration Implementation

## Date: 2026-03-28

## Completed Tasks

### 1. Copied `lib/sheets.ts`
- **Source:** `habithletics-evolve/lib/sheets.ts`
- **Target:** `habithletics-redesign-evolve/lib/sheets.ts`
- **Status:** ✅ No modifications needed

### 2. Created `components/workout/sheets-workout-view.tsx`
- **Type:** Client component ("use client")
- **Purpose:** Full live sheets-driven workout experience
- **Features implemented:**
  - Fetch workouts via `fetchWorkouts()` on mount
  - Loading state with `WorkoutSkeleton`
  - Error state with `ErrorCard` and retry callback
  - Workout selector (A-E tabs) using shadcn `Button` variants
  - Exercises grouped by category with styled category headers
  - Per-set weight/reps `Input` components with localStorage persistence
  - Progress tracking using shadcn `Progress` component
  - Completion toggle per exercise with `Icons.check`
  - Video placeholder display using `Icons.image`
  - Empty state using `EmptyPlaceholder` with compound component pattern

### 3. Modified `app/dashboard/workouts/page.tsx`
- **Change:** Two-mode page based on `NEXT_PUBLIC_SHEET_CSV_URL` env var
- **Mode 1 (sheets):** If env var set → renders `SheetsWorkoutView` inside `Shell`
- **Mode 2 (DB):** If env var not set → falls back to existing `WorkoutList` behavior
- **Auth:** Server-side `getCurrentUser()` with redirect to `/signin`

## Design System Alignment

| Source Pattern | Target Implementation |
|---|---|
| Custom `.container` CSS | `Shell` wrapper + Tailwind spacing |
| Custom `.exercise-card` CSS | shadcn `Card` with conditional `border-primary/50 bg-primary/5` |
| Custom `.selector-btn` | shadcn `Button` with variant toggle (default/outline) |
| Custom `.progress-bar` | shadcn `Progress` component |
| Custom `.tempo-badge` | shadcn `Badge` variant secondary |
| Custom `.complete-btn` | shadcn `Button` with `Icons.check` |
| Custom ErrorCard | shadcn `ErrorCard` component |
| Custom WorkoutSkeleton | shadcn `WorkoutSkeleton` component |

## TypeScript Check
- **Status:** ✅ Passes (exit code 0)
- **No errors or warnings**

## Key Implementation Notes

1. **Circular reference fix:** Renamed `load` to `loadWorkouts` to avoid TypeScript error TS2448 (block-scoped variable used before declaration)

2. **Icons mapping:**
   - Video placeholder: `Icons.image` (no `video` icon available)
   - Play icon: `Icons.activity` (no `playCircle` icon available)

3. **EmptyPlaceholder pattern:** Uses compound component pattern with `EmptyPlaceholder.Title` and `EmptyPlaceholder.Description`

4. **Server component boundary:** `page.tsx` is a server component that handles auth and conditionally renders the client `SheetsWorkoutView`

5. **localStorage key:** Uses `workout_logs` (consistent with source implementation)

## Files Created/Modified

| File | Action |
|---|---|
| `lib/sheets.ts` | Created (copied from source) |
| `components/workout/sheets-workout-view.tsx` | Created |
| `app/dashboard/workouts/page.tsx` | Modified |

## Environment Variables

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_SHEET_CSV_URL` | Set → sheets mode; Not set → DB mode |

## Success Criteria Status

- [x] `lib/sheets.ts` copied and exports `fetchWorkouts`, `saveLog`, `getLogs`, `getLogForExercise`
- [x] `SheetsWorkoutView` renders workout selector (A-E)
- [x] Exercises display grouped by category with sets/reps/tempo/rest
- [x] Per-set weight/reps inputs persist to localStorage
- [x] Completion toggle updates progress
- [x] `WorkoutSkeleton` shows during initial load
- [x] `ErrorCard` shows on fetch failure with retry
- [x] `EmptyPlaceholder` shows if sheet returns 0 workouts
- [x] Auth: unauthenticated users redirected to `/signin`
- [x] Design matches redesign system (Tailwind, shadcn, dark mode)
- [x] TypeScript check passes (exit code 0)
