# SPEC: Video Save Fix + Accurate Video Mapping

## Root Cause Analysis

---

### Issue 1: Save Changes Doesn't Persist

**Symptom:** Trainer changes video dropdown and clicks "Save Changes" — the selection is NOT saved. After page reload, the old video (or "No video") is shown.

**Root Cause:** The video Select in `workout-edit-form.tsx` uses `defaultValue` (uncontrolled) combined with `value={field.value || "none"}` (controlled) simultaneously. This creates a Reactcontrolled/uncontrolled mismatch.

Specifically at **lines 289–317** of `components/workout/workout-edit-form.tsx`:
```tsx
<Select
  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
  defaultValue={field.value || "none"}   // ← Problem: defaultValue is uncontrolled
>
  <FormControl>
    <SelectTrigger>
      <SelectValue placeholder="Select video (optional)" />  // ← SelectValue ignores defaultValue when value is set
    </SelectTrigger>
  </FormControl>
```

The `defaultValue` is set once at mount. After user interaction, `field.value` (controlled) and `defaultValue` (static) can diverge. The Select component may not properly reflect the updated `field.value` in all cases, or the initial `field.value` may not be correctly read from `defaultValues` due to Radix UI Select's behavior with `defaultValue` and `value` used together.

**Secondary Contributing Factor:** The `SelectContent` uses `readyVideos.map((video) => (value={video.muxPlaybackId || video.id}))`. If `muxPlaybackId` is null for a ready video, the value falls back to `video.id`. When the form saves, it saves the muxPlaybackId (which could be null if the video hasn't been processed), but the display uses `video.id` as fallback. This creates a disconnect.

---

### Issue 2: Video Name/Mapping Mismatch

**Symptom:** Videos aren't mapped correctly to appropriate exercises. The wrong video plays for a given exercise.

**Root Cause:** The mux lookup API (`app/api/mux/lookup/route.ts`) uses fuzzy string matching on raw filename strings:

```typescript
// Line 40-47: Flawed fuzzy matching
const sheetsCoreName = filename.replace(/\.[^.]+$/, '').toLowerCase();
for (const ex of allWithMux) {
  if (!ex.videoUrl) continue;
  const dbCoreName = ex.videoUrl.replace(/\.[^.]+$/, '').toLowerCase();
  if (sheetsCoreName.includes(dbCoreName) || dbCoreName.includes(sheetsCoreName)) {
    exercises = [{ muxPlaybackId: ex.muxPlaybackId, muxAssetId: null }];
    break;
  }
}
```

This approach is fundamentally broken because:
1. It matches on raw filenames (e.g., "book opener.MOV") against filenames in DB
2. `"book opener".includes("opener")` → true, incorrectly matching unrelated videos
3. `"SMR trap/shoulder.MOV".includes("shoulder")` → true, too broad
4. The stored `videoUrl` in `workout_exercises` may be a raw sheet filename, not a proper reference
5. The matching is non-deterministic (any match wins, not necessarily the best match)

---

## Fixes Required

### Fix 1: Video Dropdown Save Persistence

**File:** `components/workout/workout-edit-form.tsx`
**Lines:** ~289–317

**Change the Select from mixed controlled/uncontrolled to fully controlled:**

Replace the Select's `defaultValue={field.value || "none"}` with `value={field.value ?? "none"}`:

```tsx
// BEFORE (broken):
<Select
  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
  defaultValue={field.value || "none"}
>

// AFTER (fixed):
<Select
  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
  value={field.value ?? "none"}
>
```

**Also fix the SelectItem values** to ensure consistency — use only `muxPlaybackId` (since `muxPlaybackId` is the field being saved):

```tsx
// BEFORE:
<SelectItem key={video.id} value={video.muxPlaybackId || video.id}>

// AFTER (ensure muxPlaybackId is always present for ready videos):
<SelectItem key={video.id} value={video.muxPlaybackId ?? video.id}>
```

Note: Ready videos from `db.organizationVideo.findMany({ where: { status: 'ready' } })` should always have `muxPlaybackId` (webhook sets it when asset becomes ready). The `||` fallback is defensive but the `??` (nullish coalescing) is more correct since a valid empty string would not be a real playback ID.

---

### Fix 2: Video Mapping Fix

**File:** `app/api/mux/lookup/route.ts`
**Lines:** ~18–59

**Replace fuzzy substring matching with proper video lookup by title:**

The current code queries `workout_exercises` table for a matching `videoUrl`. Instead, query the `organization_videos` table directly by matching video title against the exercise name.

**Suggested replacement approach:**
1. Accept `exerciseName` parameter (not just `videoUrl`)
2. Query `organization_videos` for the org, matching `title` ILIKE `%exerciseName%`
3. Return the best match's `muxPlaybackId`

Or alternatively, if `videoUrl` must be used:
1. Store a normalized `originalFilename` or `title` in `organization_videos` at upload time
2. Match sheets data filename against `title` field using word-level matching (split on spaces/punctuation, match significant words)

**Additional fix:** The lookup route currently modifies global state by reassigning the `exercises` variable inside a loop, then returns the first match's `muxPlaybackId`. This is fragile. The logic should be cleaned up to return a deterministic result.

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `components/workout/workout-edit-form.tsx` | Fix Select to use `value` instead of `defaultValue`; fix SelectItem value to use nullish coalescing | **CRITICAL** |
| `app/api/mux/lookup/route.ts` | Replace fuzzy substring matching with proper title-based lookup | **HIGH** |

---

## Data Flow Reference

```
Trainer selects video in dropdown
  → Select onValueChange fires
  → field.onChange(video.muxPlaybackId)
  → React Hook Form state updates (exercises[index].muxPlaybackId)
  → Form submitted → PATCH /api/workouts/[workoutId]
  → API: deleteMany + create (passing muxPlaybackId)
  → Prisma: saves muxPlaybackId to workout_exercises.muxPlaybackId

On page reload:
  → Page fetches workout (includes exercises[].muxPlaybackId)
  → workoutData.exercises[].muxPlaybackId = we.muxPlaybackId
  → Form defaultValues exercises[].muxPlaybackId = exercise.muxPlaybackId
  → Select initial value = field.value (from defaultValues)
```

**Critical path is correct in the data model.** The bug is in the React component's handling of the controlled Select.

---

## Quality Gates

- CRITICAL: 0 allowed
- HIGH: 0 allowed
- MEDIUM: < 3 allowed
