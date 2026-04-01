# SPEC.md — Video Selector for Exercises

**Project:** habithletics-redesign-evolve
**Date:** 2026-04-01
**Feature:** Video Selector Dropdown for Workout Exercises
**Deployment:** https://habithletics-redesign-evolve-coral.vercel.app

---

## 1. Functionality Specification

### Goal
Add a video selector dropdown to the workout edit form, allowing trainers/owners to assign Mux videos from their organization's video library to individual exercises.

### User Flows

#### Trainer Assigning Video to Exercise
1. Trainer goes to workout edit page (`/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit`)
2. Adds or edits an exercise
3. Sees video selector dropdown below the standard fields (sets, reps, weight, notes)
4. Selects a video from the dropdown (shows "Select video" or video title if selected)
5. Video's `muxPlaybackId` is saved to `workout_exercises` when saving the workout
6. When client views the workout, the video plays inline

#### Client Viewing Workout
1. Client sees the workout with exercises
2. If exercise has a video assigned (`muxPlaybackId` exists), video plays inline
3. Client does NOT see the video selector (only trainers/owners see it)

---

## 2. Technical Approach

### A. API Changes

#### `app/api/workouts/[workoutId]/route.ts`

**Change:** Add `muxPlaybackId` to the exercise schema in PATCH handler.

```typescript
// In workoutPatchSchema.exercises:
z.object({
  exerciseId: z.string(),
  sets: z.number().min(1),
  reps: z.number().min(1),
  weight: z.number().optional(),
  notes: z.string().optional(),
  order: z.number(),
  muxPlaybackId: z.string().optional().nullable(), // NEW
})
```

**Change:** Include `muxPlaybackId` when creating workout exercises:

```typescript
// In exercises.create:
create: body.exercises.map((exercise) => ({
  exerciseId: exercise.exerciseId,
  sets: exercise.sets,
  reps: exercise.reps,
  weight: exercise.weight,
  notes: exercise.notes,
  order: exercise.order,
  muxPlaybackId: exercise.muxPlaybackId, // NEW
}))
```

---

### B. Form Changes

#### `components/workout/workout-edit-form.tsx`

**Props to add:**
```typescript
interface WorkoutEditFormProps {
  // ... existing props
  videos?: OrganizationVideo[]      // NEW: organization's videos
  isTrainer?: boolean              // NEW: show video selector if true
  userOrgRole?: string | null      // NEW: user's role in org ('owner' | 'trainer' | 'client')
}
```

**Schema change:**
```typescript
const workoutFormSchema = z.object({
  // ... existing fields
  exercises: z.array(
    z.object({
      // ... existing fields
      muxPlaybackId: z.string().optional().nullable(), // NEW
    })
  ),
})
```

**UI Changes:**
1. Add video selector dropdown after the notes field in each exercise card
2. Video selector only renders if `isTrainer === true` AND `videos` array has items
3. If no videos or user is not trainer, don't show selector
4. "No videos yet" state with link to `/trainer/videos` when `videos.length === 0`

**Video Selector UI:**
```tsx
{isTrainer && (
  <FormField
    control={form.control}
    name={`exercises.${index}.muxPlaybackId`}
    render={({ field }) => (
      <FormItem>
        <FormLabel>Video</FormLabel>
        <Select
          onValueChange={(value) => field.onChange(value === "none" ? null : value)}
          defaultValue={field.value || "none"}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Select video (optional)" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="none">No video</SelectItem>
            {videos.filter(v => v.status === 'ready').map((video) => (
              <SelectItem key={video.id} value={video.muxPlaybackId || video.id}>
                {video.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {videos.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No videos yet. <Link href="/trainer/videos" className="underline">Upload one</Link>
          </p>
        )}
      </FormItem>
    )}
  />
)}
```

**On Submit:**
Include `muxPlaybackId` in the exercises array sent to API.

---

### C. Page Changes

#### `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`

**Changes:**
1. Import OrganizationVideo type
2. Fetch organization membership for current user
3. If trainer/owner, fetch organization's videos
4. Pass `videos` and `isTrainer` props to WorkoutEditForm

```typescript
// After fetching exercises, before rendering WorkoutEditForm:

// Get user's organization membership and videos
let organizationVideos: any[] = []
let isTrainer = false

const membership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ['owner', 'trainer'] }
  },
  include: { organization: true }
})

if (membership) {
  isTrainer = true
  organizationVideos = await db.organizationVideo.findMany({
    where: { 
      organizationId: membership.organizationId,
      status: 'ready'
    },
    orderBy: { createdAt: 'desc' }
  })
}

// Pass to form:
<WorkoutEditForm
  workout={workoutData}
  exercises={exercises}
  redirectUrl="/dashboard/coaching"
  videos={organizationVideos}
  isTrainer={isTrainer}
/>
```

**Note:** Also need to include current `muxPlaybackId` in workout exercise data when fetching workout:

```typescript
// In the workout query include:
exercises: {
  include: {
    exercise: true,
  },
  orderBy: {
    order: 'asc',
  },
},

// Transform:
exercises: workout.exercises.map(we => ({
  id: we.exerciseId,
  name: we.exercise.name,
  sets: we.sets,
  reps: we.reps,
  weight: we.weight,
  notes: we.notes,
  order: we.order,
  muxPlaybackId: we.muxPlaybackId, // NEW
})),
```

---

## 3. File Structure

```
habithletics-redesign-evolve/
├── app/
│   └── api/
│       └── workouts/
│           └── [workoutId]/
│               └── route.ts           ← MODIFIED: Add muxPlaybackId to schema
│   └── dashboard/
│       └── coaching/
│           └── students/
│               └── [studentId]/
│                   └── workouts/
│                       └── [workoutId]/
│                           └── edit/
│                               └── page.tsx  ← MODIFIED: Fetch videos, pass to form
├── components/
│   └── workout/
│       └── workout-edit-form.tsx     ← MODIFIED: Add video selector dropdown
└── ALPHA-EVOLVE/
    └── SPEC-video-selector.md         ← This file
```

---

## 4. Dependencies

No new dependencies required. Using existing:
- `Select` component from shadcn/ui
- `Link` from next/link
- `db` (Prisma client)
- `OrganizationVideo` model (already exists)

---

## 5. Type Definitions

```typescript
// OrganizationVideo type (from Prisma schema)
interface OrganizationVideo {
  id: string
  organizationId: string
  muxAssetId: string
  muxPlaybackId: string | null
  title: string
  thumbnailUrl: string | null
  duration: number | null
  status: 'pending' | 'ready' | 'errored'
  createdAt: Date
  updatedAt: Date
}
```

---

## 6. Edge Cases

| Scenario | Behavior |
|----------|----------|
| No videos in library | Show "No videos yet. Upload one" link |
| Video still processing (status=pending) | Don't show in dropdown |
| Video errored (status=errored) | Don't show in dropdown |
| Client viewing workout | No video selector shown |
| Trainer with no org membership | No video selector shown |
| Video removed from library after assignment | Keep muxPlaybackId on exercise (no cascade delete) |

---

## 7. Success Criteria

- [ ] Trainer can assign a video to any exercise in their program
- [ ] Client viewing workout sees the video play correctly (via existing VideoPlayer)
- [ ] Video selector only visible to trainer/owner roles
- [ ] Empty state shows "No videos yet" with link to `/trainer/videos`
- [ ] TypeScript compiles without errors
- [ ] API saves muxPlaybackId correctly

---

## 8. Test Accounts

| Role | Email | Password |
|------|-------|---------|
| Trainer/Owner | thehivemindintelligence@gmail.com | clawdaunt |
| Client | (any assigned client) | - |

---

## 9. Out of Scope

- Video upload (already exists at `/trainer/videos`)
- Video deletion (already exists)
- Multiple videos per exercise
- Video timestamp/clip selection
