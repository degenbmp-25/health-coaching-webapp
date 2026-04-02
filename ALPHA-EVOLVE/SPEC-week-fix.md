# SPEC: Week/Workout Assignment Fixes

## Overview
Add the ability to assign and edit week numbers for workouts in a program, both from the trainer's "add workouts" dialog and the workout edit form. Also improve client-side week visibility.

## Changes

### 1. API: `app/api/programs/[id]/route.ts`

**Current**: `PATCH` accepts `addWorkoutIds: string[]` which sets `programId` only.

**New**: Accept two modes:
- **Mode A (simple)**: `addWorkoutIds: string[]` + `addWorkoutWeek?: number` + `addWorkoutDay?: number`
  - All added workouts get the same week/day
- **Mode B (detailed)**: `addWorkouts: { id: string, weekNumber?: number, dayOfWeek?: number }[]`

Update the `updateProgramSchema`:
```typescript
addWorkoutIds: z.array(z.string()).optional(),
addWorkoutWeek: z.number().int().min(1).max(52).optional(),
addWorkoutDay: z.number().int().min(0).max(6).optional(),
addWorkouts: z.array(z.object({
  id: z.string(),
  weekNumber: z.number().int().min(1).max(52).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
})).optional(),
```

When processing `addWorkouts`, update each workout with its specific weekNumber/dayOfWeek.

### 2. Trainer Page: `app/trainer/programs/[id]/page.tsx`

**Add Workout Dialog Changes:**
- Add state: `addWorkoutWeek: number | null` and `addWorkoutDay: number | null`
- Add two Select dropdowns in the dialog:
  - Week: "Same for all" (selected by default), or 1-52
  - Day: "Same for all" (selected by default), or Sun-Sat
- When saving, use `addWorkouts` array format with selected week/day for each

**Workout List Changes:**
- Add an "Edit Week" button on each workout card in the trainer's program view
- Opens a small inline edit dialog to change weekNumber and dayOfWeek
- Calls `PATCH /api/workouts/[workoutId]` to update

### 3. Workout Edit Form: `components/workout/workout-edit-form.tsx`

**Form Schema Update:**
Add `weekNumber` and `dayOfWeek` fields to the form schema.

**UI Changes:**
Add a "Scheduling" section with:
- Week Number: Select dropdown (1-52, or "Unassigned")
- Day of Week: Select dropdown (Sun, Mon, Tue, Wed, Thu, Fri, Sat, or "Unassigned")

These are optional fields. The form should still work for regular (non-program) workouts.

### 4. Client Page: `app/client/programs/[id]/page.tsx`

**Week Display Improvement:**
Currently week info is in CardDescription: 
```
{workout.weekNumber !== null && ` • ${weekNames[workout.weekNumber]}`}
```

**New design:**
- Add a prominent Badge for week number in the card header (like trainer view)
- Example: `<Badge variant="secondary">Week {workout.weekNumber}</Badge>`
- Remove the " • Week X" from CardDescription text

## Component Inventory

### New: `WeekDaySelector` (inline in trainer page dialog)
- Two Select dropdowns: Week (1-N) and Day (Sun-Sat)
- Default to null (not set)
- Used in Add Workouts dialog

### New: Inline week editor on trainer program page  
- Small popover/dialog that appears when clicking "Edit Week" on a workout
- Allows changing weekNumber and dayOfWeek
- Saves via PATCH `/api/workouts/[workoutId]`

## Testing Checklist
1. Trainer can add workouts to a program and set week number
2. Trainer can add multiple workouts to different weeks in one batch
3. Trainer can edit a workout's week number from the program page
4. Client sees week badges prominently displayed
5. Week filter tabs on client page work correctly
6. Existing workouts without weeks still display correctly
