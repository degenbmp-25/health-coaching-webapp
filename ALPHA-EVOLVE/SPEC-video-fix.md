# SPEC.md — Video Assignment Fix

## Project: habithletics-redesign-evolve

## Problem
Video UX is backwards:
- Workouts editor (client-facing) has video SELECTION dropdown (wrong)
- Programs editor (trainer-facing) needs video SELECTION dropdown (missing/broken)

## Goal
1. Workouts editor → Video PLAYBACK only (no dropdown)
2. Programs editor → Working video SELECTION dropdown

---

## Task 1: Remove Video Dropdown from Workouts Editor

**File:** `components/workout/workout-edit-form.tsx`

**Change:** Remove the video selector Select/dropdown component. Keep the VideoPlayer for playback only.

The current workouts editor likely has something like:
```tsx
<Select onValueChange={handleVideoSelect} value={exercise.organizationVideoId || ""}>
  <SelectTrigger>...</SelectTrigger>
  ...video options...
</Select>
```

Remove this entirely. The VideoPlayer (mux-player) should remain for playback.

---

## Task 2: Add Working Video Dropdown to Programs Editor

**File:** `app/trainer/programs/[id]/page.tsx`

**Current state:** Exercise editor has Sets/Reps/Weight fields only (video selector was removed by Bug-Fix)

**Change:** Add video selector dropdown per exercise, similar to what the workouts editor had before.

**Implementation:**
1. Add `organizationVideos` state to load org videos
2. Add `organizationVideoId` to each exercise in the edit state
3. Add Select dropdown per exercise with video options
4. Include `organizationVideoId` in the PATCH payload

**API Support:** Check if `app/api/workouts/[workoutId]/route.ts` PATCH supports `organizationVideoId` in exercises array. If not, add it to the Zod schema and Prisma update.

---

## Files to Modify

| File | Change |
|------|--------|
| `components/workout/workout-edit-form.tsx` | Remove video selector dropdown |
| `app/trainer/programs/[id]/page.tsx` | Add video selector dropdown per exercise |
| `app/api/workouts/[workoutId]/route.ts` | Add `organizationVideoId` to exercise update schema (if missing) |

---

## Video Dropdown Component (reuse pattern)

In programs page, add:
```tsx
<Select 
  value={editedExercise.organizationVideoId || "none"}
  onValueChange={(val) => updateExercise(index, { organizationVideoId: val === "none" ? null : val })}
>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="No video" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">No video</SelectItem>
    {organizationVideos.map((v) => (
      <SelectItem key={v.id} value={v.id}>
        {v.title}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## Success Criteria
- Workouts editor shows video playback only (no dropdown to select)
- Programs editor allows trainers to select video per exercise via dropdown
- Video selection persists when "Save Changes" is clicked
- No existing functionality broken