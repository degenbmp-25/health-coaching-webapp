# SPEC.md — Trainer Program Page Workout Editor Enhancement

## Project: habithletics-redesign-evolve
## Loop: Alpha-Evolve — Enhanced Programs Page Workout Editor

---

## 1. Problem Statement

The `/trainer/programs/[id]` page allows trainers to:
- View program details
- Add/remove workouts from program
- Assign clients to programs

But it does NOT allow trainers to:
- Edit exercise details (sets, reps, weights)
- Change exercise order within a workout
- Assign videos to exercises

Meanwhile, `/dashboard/workouts/[id]/edit` has a full workout editor, but it's in the "client" section. Trainers need to go there for proper editing.

## 2. Goal

Add robust workout editing to the trainer's Programs page (`/trainer/programs/[id]`) so trainers can fully manage workout details without leaving their context.

---

## 3. Existing Code Analysis

### `/trainer/programs/[id]/page.tsx` (Target Page)
Current structure:
- Displays program with workouts array
- Each workout has `id`, `name`, `description`, `exercises[]`
- Each exercise has `id`, `exercise.name`, `sets`, `reps`, `weight`, `order`
- Has "Add Workouts" dialog (can add existing workouts)
- Has "Remove" button per workout (removes from program assignment)
- NO exercise editing capability

### `/dashboard/workouts/[id]/edit/page.tsx` (Reference Page)
Full workout editor with:
- Exercise list with sets/reps/weight inputs
- Video selector per exercise
- Save/cancel functionality
- API: `PATCH /api/workouts/[workoutId]` with exercise updates

---

## 4. Implementation Plan

### 4.1 Add Inline Workout Editing to Programs Page

Within each workout card in `/trainer/programs/[id]`, add:
1. **"Edit Workout" button** — expands inline editor for that workout
2. **Exercise list** — shows each exercise with editable sets/reps/weight fields
3. **Video selector** — per exercise, dropdown to assign video from organization_videos
4. **Save/Cancel** — persist or discard changes

### 4.2 Component Structure

**Option: Expand existing workout card**
- Each workout card expands to show exercise editor
- Reuse existing exercise display components

**Option: Modal dialog for workout editing**
- Click "Edit Workout" → modal with full editor
- Clean separation, doesn't clutter the program view

Recommendation: **Modal dialog approach** (cleaner UX, matches existing dialog patterns in the app)

### 4.3 API Changes

The workout edit page uses `PATCH /api/workouts/[workoutId]` with this body:
```json
{
  "name": "string",
  "description": "string",
  "exercises": [
    {
      "id": "workoutExerciseId",
      "sets": 3,
      "reps": 10,
      "weight": 135,
      "organizationVideoId": "optional-video-id"
    }
  ]
}
```

The Programs page needs to call this same API for the trainer's workout editing.

### 4.4 Files to Modify

| File | Change |
|------|--------|
| `app/trainer/programs/[id]/page.tsx` | Add "Edit Workout" button + modal trigger |
| `components/workout/workout-edit-form.tsx` | (reuse) - Contains sets/reps/weight/video selector |
| `app/api/workouts/[workoutId]/route.ts` | (exists) - Already handles PATCH |

### 4.5 Video Selector Integration

Already built:
- `components/workout/workout-edit-form.tsx` has VideoPlayer with muxPlaybackId
- `/api/organizations/[id]/videos` returns organization's videos
- Video selector dropdown shows video titles

Reuse the video selector component from `workout-edit-form.tsx`.

---

## 5. UI Design

### 5.1 Add "Edit Workout" Button

In the workout card header, add:
```tsx
<div className="flex justify-between items-center">
  <h3>Workout Name</h3>
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={() => openEditWorkout(workout)}>
      Edit Workout
    </Button>
  </div>
</div>
```

### 5.2 Edit Workout Modal

```tsx
<Dialog open={editWorkoutOpen} onOpenChange={setEditWorkoutOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Edit: {selectedWorkout?.name}</DialogTitle>
    </DialogHeader>
    {/* Exercise editor with sets/reps/weight/video per exercise */}
  </DialogContent>
</Dialog>
```

### 5.3 Exercise Row in Editor

Each exercise shows:
- Exercise name (read-only)
- Sets input (number)
- Reps input (number)  
- Weight input (number)
- Video selector dropdown (optional)

---

## 6. Data Flow

1. Trainer clicks "Edit Workout" on a workout card
2. Modal opens with workout's current exercises loaded
3. Trainer edits sets/reps/weight/video
4. On save: `PATCH /api/workouts/[workoutId]` with exercise updates
5. API updates `workout_exercises` table
6. Modal closes, program data refreshes

---

## 7. Success Criteria

- Trainer can edit workout details (sets, reps, weights) from Programs page
- Trainer can assign/change videos for exercises from Programs page
- All changes persist correctly to database
- Mobile and desktop views both work
- No existing functionality broken (client assignment, workout add/remove)

---

## 8. Non-Goals (for this iteration)

- Moving the workout editor to inline (not modal)
- Creating new exercise library UI
- Bulk exercise operations
- Copy workout functionality