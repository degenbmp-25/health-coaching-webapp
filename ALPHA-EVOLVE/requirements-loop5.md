# Alpha-Evolve Loop 5 Requirements

## Issue
When a CLIENT (kvnmiller11@gmail.com) clicks "Start" on a workout from their program, they get a 404 error.

## Root Cause Hypothesis
The "Start Workout" button on `/client/programs/[id]` page creates a WorkoutSession and redirects to `/dashboard/workouts/[sessionId]`. But the page at that URL expects a workout ID, not a session ID.

## What We Know
- Client clicks "Start" on a workout
- This creates a WorkoutSession and redirects to `/dashboard/workouts/[sessionId]`
- The page `/dashboard/workouts/[workoutId]/page.tsx` tries to fetch a workout by ID
- If given a session ID instead of workout ID, the workout lookup fails → 404

## Fix Requirements
1. The page should detect if the ID is a session ID or workout ID
2. If session ID, look up the session first, get the workoutId from the session
3. Then fetch the workout using that workoutId
4. Return proper 404 if neither is valid

## Success Criteria
- Client can click "Start Workout" on their program
- They are redirected to the workout page showing that specific workout
- No 404 errors
