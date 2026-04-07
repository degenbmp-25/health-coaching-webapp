# Alpha-Evolve Requirements: Video Assignment Fix

## Project
Habithletics - Video assignment UX correction

## Problem Statement
Video functionality is currently inconsistent:
1. **Workouts editor** (`/dashboard/workouts/[id]/edit`) - has video dropdown that lets users SELECT videos (wrong - clients shouldn't assign videos)
2. **Programs editor** (`/trainer/programs/[id]`) - had video dropdown but it was removed because it didn't actually save (needs to be implemented properly)

## Goal
Correct the video UX:

1. **Workouts editor** → Video **playback only** (show video player to watch), NO dropdown to select
2. **Programs editor** → Video **dropdown selection** for trainers to assign videos to exercises, AND it must actually persist

## Requirements

### 1. Remove Video Dropdown from Workouts Editor
- In `/dashboard/workouts/[id]/edit` - Remove the video selector dropdown
- Keep video PLAYBACK only (VideoPlayer component showing the video)
- Clients should see videos but not control which video is assigned

### 2. Add Working Video Dropdown to Programs Editor
In `/trainer/programs/[id]` workout editor modal:
- Add video selector dropdown per exercise
- Must ACTUALLY SAVE when "Save Changes" is clicked
- The PATCH API (`/api/workouts/[workoutId]`) may need to be enhanced to support `organizationVideoId` in exercises array
- If API doesn't support it, implement the support

## API Requirements
The PATCH `/api/workouts/[workoutId]` body needs to support:
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
      "organizationVideoId": "optional-video-id"  // <-- THIS MUST WORK
    }
  ]
}
```

## Success Criteria
- Workouts page shows video playback only (no dropdown)
- Programs page allows trainers to select and save video assignments per exercise
- All changes persist correctly to database
- No existing functionality broken