# Requirements: Video Selector for Exercises

## Goal
Build a video selector dropdown for trainers/owners to assign existing Mux videos to exercises when building programs.

## Context
- Phase 1 Video Library is built: OrganizationVideo model, GET/DELETE API routes, trainer page at /trainer/videos
- Video playback works using muxPlaybackId in workout_exercises table
- Mux free tier limit hit (10 assets) - need to upgrade to upload more

## Requirements

### 1. Video Selector Dropdown
When trainer/owner is editing a workout (adding/editing exercises), show a video selector dropdown alongside the existing exercise fields (sets, reps, weight, notes).

### 2. Video Library Integration
- Dropdown shows all "ready" videos from the trainer's Organization's video library
- Display video title in the dropdown
- Only show videos with status "ready"

### 3. Data Persistence
Selecting a video updates `workout_exercises.muxPlaybackId` for that exercise.

### 4. Role-Based Visibility
- Video selector ONLY visible to trainer/owner roles
- Client role should NOT see the video selector

### 5. Empty State
If no videos in library (or none ready), show "No videos yet" with link to upload at `/trainer/videos`

## Technical Context

### Current State
- `WorkoutEditForm` at `components/workout/workout-edit-form.tsx` - adds/edits exercises
- `OrganizationVideo` model stores videos per organization
- `workout_exercises` table has `muxPlaybackId` column
- API `GET /api/organizations/[id]/videos` lists videos for org (already returns only owner/trainer members)
- Videos stored in Mux with `muxPlaybackId` for playback

### API Endpoint Needed
- May need endpoint to fetch current user's organization ID
- Or fetch videos directly in the page/server component

### Data Flow
1. Trainer goes to edit workout page (`/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit`)
2. Page fetches organization videos for the trainer
3. Videos are passed to WorkoutEditForm
4. Per-exercise video selector dropdown shows available videos
5. On save, muxPlaybackId is included in workout exercise update

## Success Criteria
- [ ] Trainer can assign a video to any exercise in their program
- [ ] Client viewing workout sees the video play correctly  
- [ ] Video selector only visible to trainer/owner roles
- [ ] Empty state shows "No videos yet" with link to upload

## Out of Scope
- Video upload (already exists)
- Video deletion (already exists)
- Per-exercise video URL field (sticky notes already exist)
