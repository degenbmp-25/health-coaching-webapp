# Alpha-Evolve Requirements: Video Save Fix + Accurate Mapping

## Project
Habithletics - Health Coaching Webapp

## Issues to Fix

### Issue 1: Save Changes Doesn't Persist
**Problem:** When a trainer changes the video dropdown selection and clicks "Save Changes", the video selection is NOT saved to the database. The dropdown reverts to the previous value on reload.

**Expected behavior:** Changing the video dropdown and clicking save should update `workout_exercises.muxPlaybackId` in the database.

**Likely root cause:**
- The workout edit form's save handler might not be sending the muxPlaybackId update
- Or the API route handling the save doesn't accept muxPlaybackId changes
- Or the wrong field is being updated

### Issue 2: Video Name/Mapping Mismatch
**Problem:** Videos aren't mapped to the correct exercise names. The video selector might show correct options, but either:
- The dropdown shows wrong video for an exercise
- Or playback shows the wrong video

**Expected behavior:** 
- Each exercise should show the correct video that was assigned to it
- Playback should play the correct video for that exercise

**Likely root causes:**
- The videoUrl stored in workout_exercises doesn't match the actual Mux playback ID
- Or the lookup between videoUrl and muxPlaybackId is incorrect
- Or the mapping between exercise and video is backwards

## Files to Investigate

1. **Workout Edit Form** — `components/workout/workout-edit-form.tsx`
   - How does it handle muxPlaybackId changes?
   - What data does it send to the API on save?

2. **Workout API Route** — `app/api/users/[userId]/workouts/route.ts` or similar
   - Does it accept muxPlaybackId in PATCH/UPDATE?
   - Is it saving to the correct table/field?

3. **Video Lookup** — `app/api/mux/lookup/route.ts`
   - How does it map videoUrl to muxPlaybackId?
   - Is the lookup correct?

4. **Organization Videos** — `app/api/organizations/[orgId]/videos/route.ts`
   - How are videos stored and retrieved?
   - Is the title/name correct?

5. **Workout Session View** — `components/workout/workout-session-view.tsx`
   - How does it fetch and display videos?
   - Is the muxPlaybackId being used correctly?

## Success Criteria

1. When a trainer changes a video dropdown and clicks "Save Changes", the change persists after page reload
2. Each exercise shows the correct video that was assigned to it
3. Video playback plays the correct video for each exercise

## Quality Gates
- CRITICAL: 0 allowed
- HIGH: 0 allowed
- MEDIUM: < 3 allowed