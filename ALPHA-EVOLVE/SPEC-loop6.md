# SPEC - Loop 6 Fixes

## Issue 1: Client "Start Workout" 404

### Root Cause
The `getWorkout()` function in `lib/api/workouts.ts` has a WHERE clause requiring `workout.userId === authorizedUserId`. 

When a CLIENT clicks "Start":
1. Creates session with `userId: client.id`
2. Session has `workoutId` pointing to a workout created by a TRAINER
3. Page calls `getWorkout(workoutId, client.id)`
4. `getWorkout` fails because `workout.userId === trainer.id !== client.id`
5. Returns null → 404

### Fix
The workout page should NOT use `getWorkout()` which enforces userId ownership. Instead, it should directly fetch the workout since we've already verified access via the session.

File: `app/dashboard/workouts/[workoutId]/page.tsx`

Change from:
```typescript
const workout = await getWorkout(workoutId, user.id)
if (!workout) {
  notFound()
}
```

To:
```typescript
// Don't use getWorkout() - it checks userId ownership which fails for clients accessing trainer's workouts
// We already verified access via the session lookup above
const workout = await db.workout.findFirst({
  where: { id: workoutId },
  include: {
    exercises: {
      include: { exercise: true },
      orderBy: { order: "asc" },
    },
  },
})
if (!workout) {
  notFound()
}
```

---

## Issue 2: Workouts Not Showing Week Numbers

### Root Cause
The workouts returned by the API have `weekNumber` and `dayOfWeek` fields, but they might be NULL in the database since the migration added these fields but didn't populate them.

### Investigation Needed
Check if `weekNumber` is populated in the `workout` table. If NULL, we need to either:
1. Populate weekNumber based on workout order (first 4 workouts = Week 1, etc.)
2. Or update the migration script to assign weeks

### Fix (if weekNumber is NULL)
Create a script to populate weekNumber for existing workouts based on their position.

---

## Files to Modify
1. `app/dashboard/workouts/[workoutId]/page.tsx` - Remove getWorkout userId check
2. Potentially add migration script for weekNumber if needed