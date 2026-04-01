# Video Selector Fix - SPEC

**Date:** 2026-04-01
**Status:** Draft
**Priority:** High

---

## Background

The video selector in the workout edit form has two distinct bugs:

1. **Video selector doesn't appear** for coach users (bmp19076@gmail.com)
2. **Wrong video plays** for some exercises (e.g., "Book Openers" shows wrong video)

---

## Problem 1: Video Selector Not Showing for Coach

### Root Cause

**File:** `app/dashboard/workouts/[workoutId]/edit/page.tsx`
**File:** `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`

The `isTrainer` flag is determined by checking `OrganizationMember.role`:

```typescript
const membership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ['owner', 'trainer'] }
  },
  include: { organization: true }
})

if (membership) {
  isTrainer = true
  ...
}
```

**The problem:** This check only looks for `owner` or `trainer` roles. The coach account (bmp19076@gmail.com) has `User.role = 'coach'` in the database, but their `OrganizationMember.role` may be `'coach'` or they may not have an OrganizationMember record at all.

There are **two separate role systems** being conflated:
1. `User.role` (db) — values: `'user'`, `'coach'`
2. `OrganizationMember.role` (db) — values: `'owner'`, `'trainer'`, `'client'`

The coach's `User.role` is `'coach'`, but the code only checks `OrganizationMember.role`. This is why `isTrainer` is `false` for the coach.

### Fix Approach

Expand the `isTrainer` check to also consider `User.role === 'coach'` OR include `'coach'` in the OrganizationMember query.

**Option A (Recommended):** Add `role: { in: ['owner', 'trainer', 'coach'] }` to the OrganizationMember check, and also check `User.role === 'coach'`.

**Option B:** Create a unified helper function `canManageWorkouts(user)` that checks all valid scenarios.

### File Changes

**File:** `app/dashboard/workouts/[workoutId]/edit/page.tsx`
```typescript
// BEFORE
const membership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ['owner', 'trainer'] }
  },
  include: { organization: true }
})

// AFTER
// Also check User.role === 'coach' since coaches manage workouts
const dbUser = await db.user.findUnique({
  where: { id: user.id },
  select: { role: true }
})

const membership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ['owner', 'trainer', 'coach'] }
  },
  include: { organization: true }
})

if (membership || dbUser?.role === 'coach') {
  isTrainer = true
  ...
}
```

**File:** `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`
- Same change as above (this file already fetches `dbUser`, just update the condition)

**File:** `app/trainer/layout.tsx`
**File:** `app/dashboard/layout.tsx`
- Add `'coach'` to the role check so trainers/coaches see the TRAINER nav section

---

## Problem 2: Wrong Video Assigned to Exercise

### Root Cause

**File:** `components/workout/workout-edit-form.tsx`

The video selector filter only checks `status === 'ready'`:

```typescript
const readyVideos = videos.filter(v => v.status === 'ready')
```

But `OrganizationVideo.muxPlaybackId` can be `null` even when `status === 'ready'`. This happens when:
1. The video was uploaded but Mux hasn't returned the playback ID yet
2. The webhook that sets `muxPlaybackId` failed or never fired
3. The video was imported/migrated without the `muxPlaybackId`

When `muxPlaybackId` is null, the SelectItem value falls back to `video.id`:

```typescript
<SelectItem 
  key={video.id} 
  value={video.muxPlaybackId || video.id}  // Falls back to DB ID when null!
>
  {video.title}
</SelectItem>
```

When the form submits, it sends `muxPlaybackId = video.id` (the internal DB UUID) instead of a real Mux playback ID. The VideoPlayer then tries to stream from `https://stream.mux.com/[DB-UUID].m3u8` which doesn't exist, resulting in a wrong/broken video.

### Fix Approach

**Primary fix (frontend guard):** Filter out videos with null `muxPlaybackId`:

```typescript
const readyVideos = videos.filter(v => v.status === 'ready' && v.muxPlaybackId != null)
```

This ensures only videos with valid muxPlaybackId appear in the dropdown.

**Secondary fix (DB migration):** Investigate and fix `OrganizationVideo` records where `muxPlaybackId` is null but `status === 'ready'`. Run a migration to either:
1. Re-trigger Mux asset lookup for those videos
2. Or mark them as errored if the Mux asset truly doesn't exist

### File Changes

**File:** `components/workout/workout-edit-form.tsx`

```typescript
// BEFORE
const readyVideos = videos.filter(v => v.status === 'ready')

// AFTER  
const readyVideos = videos.filter(v => v.status === 'ready' && v.muxPlaybackId != null)
```

---

## Additional Issue: Video Selector Value Duplication Risk

**File:** `components/workout/workout-edit-form.tsx`

The `SelectItem value` uses `video.muxPlaybackId || video.id`. If two videos in the same organization somehow share the same `muxPlaybackId` (e.g., duplicate Mux assets), the dropdown would have duplicate values and undefined behavior.

**Fix:** Use `video.id` as the stable internal identifier, and look up the muxPlaybackId when saving. This requires changing the data flow:

1. Store `video.id` (not muxPlaybackId) in the form
2. On save, look up `muxPlaybackId` from `OrganizationVideo` by `id`
3. Store the muxPlaybackId in `WorkoutExercise.muxPlaybackId`

This is a more robust fix for long-term correctness but requires a larger change.

### Recommended: Quick Fix First

For the immediate fix, just add the `muxPlaybackId != null` filter. This solves the problem without changing the data flow.

---

## Migration Plan

### Phase 1: Quick Fix (Low Risk)
1. Add `muxPlaybackId != null` filter in `workout-edit-form.tsx`
2. Add `'coach'` to `OrganizationMember.role` checks in both edit pages
3. Add `'coach'` to layout role checks

### Phase 2: DB Audit
1. Query `SELECT * FROM organization_videos WHERE status = 'ready' AND mux_playback_id IS NULL`
2. For each row, check if the Mux asset exists via Mux API
3. Update `muxPlaybackId` if found, or mark as errored

### Phase 3: Data Flow Improvement (Future)
1. Change video selector to store `video.id` in form
2. On workout save, resolve muxPlaybackId server-side
3. This prevents invalid IDs from ever being stored

---

## Test Plan

1. Log in as bmp19076@gmail.com (coach)
2. Navigate to `/dashboard/workouts/[workoutId]/edit`
3. Verify video selector dropdown appears
4. Verify only videos with valid muxPlaybackId appear
5. Select a video and save
6. Verify correct video plays in workout view
7. Check no console errors

---

## Files to Modify

| File | Change | Risk |
|------|--------|------|
| `app/dashboard/workouts/[workoutId]/edit/page.tsx` | Expand role check | Low |
| `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx` | Expand role check | Low |
| `app/trainer/layout.tsx` | Add 'coach' to role check | Low |
| `app/dashboard/layout.tsx` | Add 'coach' to role check | Low |
| `components/workout/workout-edit-form.tsx` | Filter null muxPlaybackId | Low |

---

## Root Cause Summary

1. **Coach can't see video selector:** The role check uses `OrganizationMember.role IN ('owner', 'trainer')` but coach's role is stored as `'coach'` in OrganizationMember or `'coach'` in User.role. Two separate role systems are being used inconsistently.

2. **Wrong video plays:** `OrganizationVideo` entries with `status='ready'` but `muxPlaybackId=NULL` still appear in the dropdown. Their `SelectItem value` falls back to the internal DB UUID, which is not a valid Mux playback ID, causing wrong video or no video.
