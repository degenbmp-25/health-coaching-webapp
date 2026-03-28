# Alpha-Evolve Loop 2 Requirements: Sheets Integration

## Goal
Integrate Google Sheets-based live workout page into the redesign-evolve branch to replace the existing "workouts" tab with a unified, professionally-designed experience.

## Current State

### habithletics-evolve (source of truth for sheets)
- `lib/sheets.ts` - Google Sheets integration with:
  - `fetchWorkouts()` - fetches and parses CSV from published Google Sheet
  - `saveLog()` / `getLogs()` - localStorage workout log persistence
  - Types: `Workout`, `Exercise`, `WorkoutLog`
- `app/page.tsx` - Complete live workout page with:
  - Workout selector (A-E)
  - Exercise categories (Movement Prep, Resistance, etc.)
  - Set logging (weight/reps per set)
  - Progress tracking
  - Video placeholder support
  - Error handling with retry
  - Loading skeleton
  - AuthGuard protection
- Custom `ErrorCard`, `WorkoutSkeleton`, `AuthGuard` components in `app/components/`

### habithletics-redesign-evolve (alpha-evolve-loop-1, target)
- `lib/sheets.ts` - **MISSING** (needs to be copied from habithletics-evolve)
- `app/dashboard/workouts/page.tsx` - Current empty management page (shows "No workouts created")
- Design system: CSS variables, Tailwind, dark mode support
- Components already built:
  - `components/ui/error-card.tsx` - Reusable error card
  - `components/workout/workout-skeleton.tsx` - Loading skeleton
  - `components/workout/workout-list-skeleton.tsx` - List skeleton
  - `components/workout/workout-item.tsx` - Workout card
  - `components/workout/workout-list.tsx` - Workout list grid
  - `components/empty-placeholder.tsx` - Empty state
  - `components/layout/shell.tsx` - Page shell
  - `components/pages/dashboard/dashboard-header.tsx` - Dashboard header

## Requirements

### 1. sheets.ts Integration (CRITICAL)
- Copy `lib/sheets.ts` from habithletics-evolve to habithletics-redesign-evolve
- Ensure `NEXT_PUBLIC_SHEET_CSV_URL` env var is set (should already be in Vercel project)
- The sheets integration handles:
  - Fetching workout data from Google Sheets CSV
  - Parsing exercises, sets, reps, tempo, rest, load, notes
  - localStorage workout log persistence

### 2. Replace ONLY the Workouts Page Content (Not Dashboard Shell)
- Modify `app/dashboard/workouts/page.tsx` to use `fetchWorkouts()` from sheets.ts
- **KEEP** the existing dashboard shell (Shell component, DashboardHeader)
- **REPLACE** the content area with the live workout experience (selector, categories, exercises, logging)
- The database-based workout management (if any) can be moved to a sub-route like `/dashboard/workouts/manage`

### 3. Design Consistency
- Use the redesign's design system (CSS variables, Tailwind classes)
- Match the existing dashboard styling (Shell, DashboardHeader components)
- Use `components/ui/error-card.tsx` for errors
- Use `components/workout/workout-skeleton.tsx` for loading
- Maintain dark mode support

### 4. AuthGuard Integration
- Protect the workout page so only logged-in users can access
- Use the redesign's auth system (Clerk via `getCurrentUser()`)
- Redirect to signin if not authenticated

### 5. Progressive Enhancement
- Handle loading states gracefully (show skeleton)
- Handle errors gracefully (show ErrorCard with retry)
- Handle empty state (no workouts in sheet)
- Work offline (localStorage logs sync when online)

### 6. Environment Variables
Ensure these are set in Vercel project:
- `NEXT_PUBLIC_SHEET_CSV_URL` - Google Sheets published CSV URL (should exist from habithletics-evolve)

## Files to Modify/Create

1. **COPY** `lib/sheets.ts` from habithletics-evolve
2. **MODIFY** `app/dashboard/workouts/page.tsx` - Replace with sheets-based page
3. **CREATE** `app/dashboard/workouts/[workoutId]/page.tsx` - Individual workout view (optional)
4. **MODIFY** `components/workout/workout-item.tsx` - May need updates for sheets data
5. **CREATE** `components/workout/sheets-workout-view.tsx` - Sheets-specific workout view component

## Success Criteria
- [ ] Dashboard shell remains intact (Shell, DashboardHeader)
- [ ] Live workout page loads data from Google Sheets
- [ ] Workout selector (A-E) works
- [ ] Exercises display with sets/reps/load
- [ ] Set logging saves to localStorage
- [ ] Progress tracking works
- [ ] Error handling shows ErrorCard on failure
- [ ] Loading shows skeleton
- [ ] Design matches redesign system
- [ ] Auth protection works
- [ ] Deploys successfully to Vercel
