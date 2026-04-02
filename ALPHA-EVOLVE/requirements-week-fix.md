# Requirements: Week/Workout Assignment Fixes

## Problem Summary
Three related issues in the Habithletics week/program management system:

1. **Client view**: Week info is buried in CardDescription (subtle text) instead of visible badges
2. **Trainer add dialog**: No way to set week number when adding workouts to a program
3. **Trainer edit**: No way to change a workout's week after adding it

## Success Criteria
1. ✅ Clients can clearly see which week each workout belongs to (week badges, prominent display)
2. ✅ Trainers can assign week numbers when adding workouts to a program  
3. ✅ Trainers can edit/change the week number of existing workouts
4. ✅ Week filter tabs work properly for clients

## Files to Modify

### 1. `app/trainer/programs/[id]/page.tsx`
**Change**: Add week number selector to the "Add Workouts" dialog
- Add `weekNumber` state (number or null)
- Add `dayOfWeek` state (number or null)  
- When saving workouts via `addWorkoutIds`, also set `weekNumber` and `dayOfWeek` for each added workout
- **API update needed**: The `PATCH /api/programs/[id]` route needs to support setting week/day when adding workouts

### 2. `app/api/programs/[id]/route.ts`
**Change**: Support setting weekNumber and dayOfWeek when adding workouts
- Accept `addWorkouts` array with `{ id, weekNumber?, dayOfWeek? }` objects
- OR accept `weekNumber`/`dayOfWeek` as single values applied to all added workouts

### 3. `components/workout/workout-edit-form.tsx`
**Change**: Add week number and day of week selectors to the form
- Add `weekNumber` and `dayOfWeek` to the form schema
- Add UI fields for week (1-52 select) and day (Mon-Sun select)
- Pass these values to the PATCH API call

### 4. `app/api/workouts/[workoutId]/route.ts`
**Status**: Already supports `weekNumber` and `dayOfWeek` in PATCH - no changes needed

### 5. `app/client/programs/[id]/page.tsx`
**Change**: Make week info more visible in client view
- Add week badge (like trainer view) alongside workout name
- Use Badge component for week number instead of plain text in CardDescription

## Implementation Plan

### Phase 1: Fix API to support week assignment when adding workouts
- Update `PATCH /api/programs/[id]` to accept workout objects with weekNumber/dayOfWeek

### Phase 2: Add week selector to trainer add-workouts dialog
- Add week number dropdown (1-N or leave unassigned)
- Add day-of-week dropdown (optional, Mon-Sun)
- Pass week info when calling saveWorkouts

### Phase 3: Add week edit capability to workout edit form  
- Add week number and day-of-week selectors
- These will work via existing PATCH `/api/workouts/[workoutId]` endpoint

### Phase 4: Improve client view week display
- Show week as a prominent Badge (like trainer view) 
- Move week out of subtle CardDescription into visible header area
