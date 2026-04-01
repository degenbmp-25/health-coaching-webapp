# Video Selector Fix - Alpha-Evolve Requirements

## Target
- **Codebase:** `/home/magic_000/BeastmodeVault/vault/projects/habithletics-redesign-evolve`
- **Deployment:** https://habithletics-redesign-evolve-coral.vercel.app
- **Test Accounts:**
  - bmp19076@gmail.com (coach) - Clerk ID: user_xxx
  - thehivemindintelligence@gmail.com (trainer)  
  - kvnmiller11@gmail.com (client)

## Problem 1: Video Selector Not Showing for Coach

**Symptom:** When logged in as bmp19076@gmail.com (coach role), the video selector dropdown doesn't appear in the workout edit form.

**Root Cause (suspected):** The workout edit form checks `user?.publicMetadata?.role === "coach"` to show the video selector, but:
- The UI uses Clerk's publicMetadata.role
- The database has the role in OrganizationMember table
- These are OUT OF SYNC

**Fix Required:** Ensure coach/trainer users can see and use the video selector when editing workouts.

## Problem 2: Wrong Video Assigned to Exercise

**Symptom:** When assigning videos to exercises, some exercises show the wrong video (e.g., "Book Openers" shows a different exercise's video).

**Root Cause (suspected):** The video-to-exercise mapping in the database is incorrect. The muxPlaybackId for some exercises points to the wrong Mux asset.

**Fix Required:** Either:
1. Allow trainers to manually reassign the correct video to each exercise
2. Fix the video-to-exercise matching logic in the migration/import

## Success Criteria

1. **Coach bmp19076 can see video selector** when editing workouts
2. **Trainer can assign correct video** to each exercise via dropdown
3. **Video plays correctly** for the assigned exercise
4. **No console errors** during video assignment flow

## Technical Context

- Video selector component: `components/workout/workout-edit-form.tsx`
- Video dropdown shows OrganizationVideo entries filtered by the trainer's organization
- Workout exercises have `muxPlaybackId` field in database
- Mux assets already uploaded (10 videos in OrganizationVideo table)
- Video player: HTML5 `<video>` with hls.js (NOT MuxPlayer React)

## Testing Instructions

1. Log in as bmp19076@gmail.com
2. Navigate to a workout
3. Click Edit
4. Verify video selector dropdown appears
5. Change video assignment for an exercise
6. Save and verify correct video plays
