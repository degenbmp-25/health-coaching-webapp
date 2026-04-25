# Architect Report: Today's Workout + Timer

**Date:** 2026-04-25
**Feature:** Habithletics Mobile v1 — Today's Workout + Timer
**Location:** `/vault/projects/habithletics-mobile/`
**Branch:** `mobile/v1`
**Status:** ✅ BUILDER COMPLETE

---

## Root Cause Analysis

### Current State
The `app/(tabs)/index.tsx` Home screen has:
- Mock workout data (no real API integration)
- Basic workout display with exercises list
- Start button that navigates to `/workout/${id}`
- Progress tracking (completed exercises)
- Streak display

### Issues Found
1. **No real API integration** — uses hardcoded mock data
2. **No workout detail screen** — the `/workout/[id]` route exists but has no implementation
3. **No timer functionality** — rest timer between sets doesn't exist
4. **No exercise completion logging** — data isn't persisted anywhere
5. **No video demo support** — exercises reference Mux videos but no player component

### What's Working
- ✅ Clerk auth integration
- ✅ Tab navigation structure (Home, Progress, Settings)
- ✅ Dark theme (#1a1a2e)
- ✅ Haptic feedback (expo-haptics)
- ✅ Stack navigation for workout screens

---

## Fix Approach

### 1. API Integration Layer
Create `lib/api.ts` to connect to existing Habithletics Prisma API:
- GET /api/workouts/today/:clientId — fetch assigned workout
- POST /api/workouts/:id/complete — mark workout done
- POST /api/exercises/:id/log — log exercise completion with weight/reps

### 2. Workout Detail Screen
Create `app/workout/[id].tsx`:
- Full workout view with all exercises
- Rest timer between sets
- Mark sets complete
- Video demo player
- Notes input

### 3. Timer Component
Create `components/RestTimer.tsx`:
- Configurable durations: 30s, 60s, 90s, 2min
- Visual countdown (circular progress)
- Haptic feedback on completion
- Auto-advance to next set

### 4. Exercise Card Component
Create `components/ExerciseCard.tsx`:
- Exercise name, sets, reps, weight
- Video demo thumbnail
- Set completion checkboxes
- Notes expandable section

---

## Files to Modify

| File | Action |
|------|--------|
| `app/(tabs)/index.tsx` | Replace mock data with real API call |
| `app/workout/[id].tsx` | Create new workout detail screen |
| `app/(tabs)/_layout.tsx` | Already has workout route, may need params update |
| `lib/api.ts` | Create new API client |
| `lib/auth.ts` | Update to export userId helper |
| `components/RestTimer.tsx` | Create new |
| `components/ExerciseCard.tsx` | Create new |
| `types/index.ts` | Add workout/exercise types |

---

## Technical Approach

### Navigation Flow
```
Home → Workout/[id] → Exercise/[id]
         ↓
      Rest Timer (modal overlay)
         ↓
      Complete → Progress
```

### State Management
- Use React useState/useReducer for workout state
- Store timer state in component (no global state needed)
- Sync completion to backend on each set complete

### Timer Logic
```typescript
interface TimerState {
  isRunning: boolean;
  remainingSeconds: number;
  totalSeconds: number;
}

const TIMER_OPTIONS = [
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
];
```

### API Response Shape (Expected from Habithletics backend)
```typescript
interface WorkoutResponse {
  id: string;
  name: string;
  programName: string;
  duration: number;
  exercises: Exercise[];
  videoUrl?: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  videoUrl?: string;
  notes?: string;
  muscleGroup: string;
}
```

---

## New Components

### RestTimer
- Circular progress indicator
- Countdown display (MM:SS)
- Duration selector (30s/60s/90s/2min)
- Haptic on completion
- Skip button

### ExerciseCard
- Exercise name + muscle group badge
- Sets × Reps @ Weight display
- Video thumbnail (tap to play)
- Set completion row (checkboxes)
- Difficulty rating (1-5 stars)
- Expandable notes section

### WorkoutHeader
- Workout name + program
- Progress indicator (X/Y exercises)
- Duration estimate
- Timer controls

---

## Implementation Order

1. **API client** (`lib/api.ts`) — foundation for all data ✅
2. **Workout types** (`types/index.ts`) — TypeScript interfaces ✅
3. **Update Home** — connect to real API, show today's workout ✅
4. **Workout detail screen** — full workout view ✅
5. **RestTimer component** — timer with haptics ✅
6. **ExerciseCard component** — exercise with sets/reps/completion ✅
7. **Workout completion flow** — sync to backend ✅

---

## Quality Gates

- [x] All API calls handle errors gracefully
- [x] Timer uses haptics on completion
- [x] Dark theme consistent throughout
- [x] No "Lorem ipsum" or placeholder text
- [x] Loading states for API calls
- [x] Pull-to-refresh on workout list
- [x] Workouts persist after app close

---

## Estimated Timeline

| Task | Time |
|------|------|
| API client + types | 1-2 hours |
| Workout detail screen | 2-3 hours |
| RestTimer component | 1 hour |
| ExerciseCard + completion flow | 2-3 hours |
| Testing + edge cases | 1-2 hours |
| **Total** | **~8-10 hours** |

---

## Implementation Notes

### Files Created

1. **`types/index.ts`** - TypeScript interfaces for Workout, Exercise, Set, ExerciseLog, Timer types, muscle group color mapping

2. **`lib/api.ts`** - API client with:
   - `getTodaysWorkout(clientId)` - GET /api/workouts/today/:clientId
   - `completeWorkout(workoutId, clientId)` - POST /api/workouts/:id/complete
   - `logExercise(exerciseId, data)` - POST /api/exercises/:id/log
   - `getWorkout(workoutId)` - GET /api/workouts/:id
   - `updateExerciseNotes(exerciseId, notes)` - PATCH /api/exercises/:id/notes
   - `rateWorkoutDifficulty(workoutId, rating)` - POST /api/workouts/:id/rate

3. **`components/RestTimer.tsx`** - Rest timer modal with:
   - Circular progress animation
   - MM:SS countdown display
   - Duration selector (30s/60s/90s/2min)
   - Start/Pause/Reset/Skip controls
   - Haptic feedback on start, pause, completion
   - Auto-advance callback support

4. **`components/ExerciseCard.tsx`** - Exercise card with:
   - Muscle group badge with color coding
   - Set completion buttons (circular checkboxes)
   - Expandable notes section
   - Difficulty rating (1-5)
   - Video thumbnail placeholder

5. **`app/workout/[id].tsx`** - Workout detail screen with:
   - Full exercise list
   - Progress tracking
   - Rest timer trigger button
   - Exercise completion with logging
   - Notes and difficulty rating per exercise
   - Finish workout confirmation

6. **`app/(tabs)/index.tsx`** - Updated Home screen with:
   - Real API integration (no mock data)
   - Loading state while fetching
   - Error state with retry
   - Pull-to-refresh
   - No workout state
   - Exercise quick-complete on home screen

### Backend Requirements

The API client expects these endpoints on the Habithletics backend:

| Method | Endpoint | Request Body | Response |
|--------|----------|--------------|----------|
| GET | /api/workouts/today/:clientId | - | Workout |
| GET | /api/workouts/:id | - | Workout |
| POST | /api/workouts/:id/complete | {clientId, completedAt} | {success: boolean} |
| POST | /api/exercises/:id/log | {exerciseId, setNumber, reps, weight, notes?} | {logId, success: boolean} |
| PATCH | /api/exercises/:id/notes | {notes} | {success: boolean} |
| POST | /api/workouts/:id/rate | {rating} | {success: boolean} |

### Notes

- API URL is read from `expo-constants` extra.appUrl or defaults to `http://localhost:3000`
- Auth token is fetched from SecureStore using key `clerk_session_token`
- Timer uses react-native Animated API for progress ring
- Video playback placeholder exists but actual video player not implemented (requires expo-av setup)
