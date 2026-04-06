# Alpha-Evolve Requirements: Enhanced Programs Page Workout Editor

## Project
Habithletics - `/trainer/programs/[id]` page enhancement

## Problem Statement
From the trainer's perspective, the only way to fully edit workouts (sets, reps, weights, exercise selection, video assignment) is from the "workouts" page (`/dashboard/workouts/[id]/edit`), which is designed for clients. The trainer's Programs page (`/trainer/programs/[id]`) only has basic functionality:
- View program details
- Add/remove workouts
- Assign clients to programs

But trainers CANNOT:
- Edit exercise details (sets, reps, weights)
- Change exercise order within a workout
- Assign videos to exercises
- Modify individual exercise details

Meanwhile, the "Workouts" page has a fully-featured workout editor with all these capabilities, but it's in the wrong location for trainers.

## Goal
Enhance the `/trainer/programs/[id]` page to include the same robust workout editing capabilities that exist in the `/dashboard/workouts/[id]/edit` page, so trainers can fully manage programs without needing to go to the client's workout view.

## Requirements
1. **Trainer workout editor in Programs page** - Add full workout editing capability to `/trainer/programs/[id]`:
   - Edit sets, reps, weights for each exercise
   - Reorder exercises within a workout
   - Select different exercises from the exercise library
   - Assign videos to exercises via video selector
   - Save changes persist correctly

2. **Consistent UX** - The editing experience should feel native to the Programs page context

3. **No regression** - Don't break existing functionality (client assignment, workout add/remove, etc.)

## Scope
- Focus on `/trainer/programs/[id]` page enhancement
- Reuse existing components from `/dashboard/workouts/[id]/edit` if possible
- Keep the existing "Assign to Clients" section working

## Non-Goals (for this iteration)
- Building new exercise library UI (reuse existing)
- Video upload (already exists)
- Moving the workout editor to a modal/dialog (keep it inline if possible)

## Success Criteria
- Trainer can fully edit workout details (sets, reps, weights, exercises, videos) from the Programs page
- All changes persist correctly to the database
- Mobile and desktop views both work
- No existing functionality is broken
