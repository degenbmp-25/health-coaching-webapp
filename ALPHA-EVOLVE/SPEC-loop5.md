# SPEC - Fix Client "Start Workout" 404

## Problem
Client clicks "Start" on `/client/programs/[id]` → creates WorkoutSession → redirects to `/dashboard/workouts/[sessionId]` → page expects workout ID → 404

## Fix - Two Approaches

### Approach 1: Fix at the Page Level (Recommended)
In `/dashboard/workouts/[workoutId]/page.tsx`:
1. Check if `params.workoutId` exists as a WorkoutSession ID
2. If yes, get the workoutId from that session
3. Fetch the workout using that workoutId
4. If neither session nor workout found, show 404

### Approach 2: Fix at the Source (Alternative)
In the "Start" button handler:
1. Instead of redirecting to `/dashboard/workouts/[sessionId]`
2. Redirect to `/dashboard/workouts/[actualWorkoutId]` with session stored in cookie/query param

## Implementation - Approach 1

File: `app/dashboard/workouts/[workoutId]/page.tsx`

Change the data fetching logic:
```typescript
// BEFORE (broken):
const workout = await getWorkout(params.workoutId)
if (!workout) notFound()

// AFTER (fixed):
let workoutId = params.workoutId

// Check if this is actually a session ID
const session = await db.workoutSession.findFirst({
  where: { id: params.workoutId },
  select: { workoutId: true }
})

if (session) {
  workoutId = session.workoutId
}

// Now fetch the workout
const workout = await getWorkout(workoutId)
if (!workout) notFound()
```

## Files to Modify
- `app/dashboard/workouts/[workoutId]/page.tsx`

## Verification
1. Log in as kvnmiller11@gmail.com
2. Go to /client/programs/[id]
3. Click "Start Workout" on any workout
4. Should see the workout page, not 404
