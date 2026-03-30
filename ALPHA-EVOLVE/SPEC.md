# Habithletics Alpha-Evolve Specification

## Issue 1: Non-functional Buttons

### Root Cause Analysis

#### Button: "Start Workout" (Client Program Detail Page)
**File:** `app/client/programs/[id]/page.tsx` → `startWorkout()` function

**Problem:** The `POST /api/workout-sessions` endpoint has a flawed authorization check:

```typescript
// /api/workout-sessions/route.ts line ~25
const workout = await db.workout.findFirst({
  where: {
    id: workoutId,
    OR: [
      { userId: user.id },
      { user: { coachId: user.id } },
    ],
  },
})
```

**Why it fails:**
- In the multi-tenant model, program workouts are owned by the **trainer** (their `userId`), not the client
- The `coachId` relationship is legacy (old model) - multi-tenant uses `OrganizationMember` instead
- A client accessing a program workout matches **neither condition** → returns 404
- The client gets no feedback - the button silently fails

#### Button: "Manage →" (Trainer Programs List)
**Status:** ✅ **WORKS** - routes to `/trainer/programs/[id]` correctly

#### Button: "Assign Program" (Trainer Program Detail)
**Status:** ✅ **FUNCTIONAL** - correctly creates `ProgramAssignment`

#### Missing UI: No Way to Add Workouts to Program
**File:** `app/trainer/programs/[id]/page.tsx`

**Problem:** The trainer program detail page shows existing workouts but has **no UI to add or remove workouts** from a program. The PATCH `/api/programs/[id]` accepts `workoutIds` but there's no interface to use it.

#### Missing UI: No "Edit Workout" Button
**Problem:** Individual workouts in the trainer program detail show no edit action. Workouts should be editable at `dashboard/workouts/[workoutId]/edit`.

---

### Files Requiring Changes (Issue 1)

| File | Change |
|------|--------|
| `app/api/workout-sessions/route.ts` | Fix authorization to check program assignment, not just coachId |
| `app/api/workout-sessions/[sessionId]/route.ts` | Fix GET authorization same issue |
| `app/trainer/programs/[id]/page.tsx` | Add "Add Workouts" UI to program detail |

---

## Issue 2: Week/Periodization Functionality

### Current Data Model (Insufficient)

```
Program ──────< Workout (flat list, no week grouping)
    │
    └───< ProgramAssignment (client link, only has startedAt)
```

### Problems with Current Model
1. No concept of "current week" for an in-progress program
2. No grouping of workouts into training weeks/phases
3. No periodization (mesocycles, phases, deload weeks)
4. `startedAt` on `ProgramAssignment` is unused for progression

### Proposed Data Model

```prisma
// New model for week-based periodization
model ProgramWeek {
  id          String   @id @default(cuid())
  programId   String   @map("program_id")
  weekNumber  Int      @map("week_number")      // 1, 2, 3... or -1 for deload
  name        String                           // "Week 1 - Hypertrophy", "Deload"
  description String?
  
  // Periodization metadata
  phase       String?                          // "hypertrophy", "strength", "deload"
  targetSets  Int?     @map("target_sets")     // Optional weekly volume target
  targetReps  Int?     @map("target_reps")      // Optional rep target
  
  // Order within program
  order       Int      @default(0)
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  program     Program  @relation(fields: [programId], references: [id], onDelete: Cascade)
  workouts    Workout[]
  
  // Unique constraint: one week number per program
  @@unique([programId, weekNumber])
  @@map("program_weeks")
}

// Workout now references ProgramWeek (optional for flexibility)
model Workout {
  // ... existing fields ...
  
  // Replace direct programId with week-based relationship
  programWeekId   String?  @map("program_week_id")
  programWeek     ProgramWeek? @relation(fields: [programWeekId], references: [id], onDelete: SetNull)
  
  // Keep programId for queries, but workouts belong to a week within the program
  // Actually, we should derive programId from programWeek.programId
  // Let's keep it simpler - workout belongs to EITHER program directly OR to a programWeek
}

// ProgramAssignment tracks current week
model ProgramAssignment {
  id         String   @id @default(cuid())
  programId  String   @map("program_id")
  clientId   String   @map("client_id")
  startedAt  DateTime @default(now()) @map("started_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  
  // NEW: Track current week for periodization
  currentWeekId    String?  @map("current_week_id")
  currentWeek      ProgramWeek? @relation("CurrentWeek", fields: [currentWeekId], references: [id])
  
  // Relations
  program Program @relation(fields: [programId], references: [id], onDelete: Cascade)
  client  User    @relation("ClientPrograms", fields: [clientId], references: [id])
  
  // A client can only be assigned a program once (per program)
  @@unique([programId, clientId])
  @@map("program_assignments")
}
```

### Simpler Alternative (If ProgramWeek Overkill)

If you don't need full periodization, a simpler approach:

```prisma
model Workout {
  // ... existing fields ...
  
  // Simple week assignment
  weekNumber   Int?     @map("week_number")    // 1, 2, 3... null = unassigned
  dayOfWeek    Int?     @map("day_of_week")    // 0-6 for scheduling within week
}
```

**Tradeoff:** Simpler schema but less flexibility for periodization metadata (phase names, deload indicators, volume targets).

---

### API Changes Needed

#### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/programs/[id]/weeks` | List all weeks in a program |
| POST | `/api/programs/[id]/weeks` | Create a new week |
| PATCH | `/api/programs/[id]/weeks/[weekId]` | Update week details |
| DELETE | `/api/programs/[id]/weeks/[weekId]` | Delete a week |
| GET | `/api/program-assignments/[assignmentId]/current-week` | Get client's current week info |
| POST | `/api/program-assignments/[assignmentId]/advance-week` | Advance to next week |

#### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `GET /api/workouts/program/[programId]` | Include week info in response |
| `GET /api/program-assignments/client/[clientId]` | Include current week number (calculated from start date + elapsed weeks) |
| `POST /api/workout-sessions` | Authorization: check if user is assigned to program OR owns workout |

---

### UI Changes Needed

#### Trainer Views

| File | Change |
|------|--------|
| `app/trainer/programs/[id]/page.tsx` | Show weeks accordion/section, add workouts to specific weeks |
| `app/trainer/programs/[id]/weeks/[weekId]/page.tsx` | (New) Week detail/edit page |

#### Client Views

| File | Change |
|------|--------|
| `app/client/programs/[id]/page.tsx` | Show workouts grouped by week, highlight current week |
| `app/client/programs/[id]/week/[weekId]/page.tsx` | (New) Week detail view for client |

---

## Implementation Approach

### Phase 1: Fix Non-functional Buttons (Quick Win)
1. Fix `app/api/workout-sessions/route.ts` authorization to check `ProgramAssignment` existence
2. Fix `app/api/workout-sessions/[sessionId]/route.ts` authorization same fix
3. Add "Add Workouts" dialog to trainer program detail page

### Phase 2: Week/Periodization (Scaffold)
1. Create migration for `ProgramWeek` model
2. Add `weekNumber` to `Workout` (simpler approach)
3. Add `currentWeekId` to `ProgramAssignment`
4. Create week API routes
5. Update trainer UI to manage weeks
6. Update client UI to show week progress

### Phase 3: Periodization Features (Polish)
1. Add phase labels, deload indicators
2. Auto-advance week based on completed workouts
3. Week templates for program cloning

---

## File Change Summary

### Issue 1 Files
```
app/api/workout-sessions/route.ts          # Fix authorization
app/api/workout-sessions/[sessionId]/route.ts  # Fix authorization  
app/trainer/programs/[id]/page.tsx         # Add workout management UI
```

### Issue 2 Files
```
prisma/schema.prisma                       # Add ProgramWeek model
app/api/programs/[id]/weeks/route.ts       # New: weeks CRUD
app/api/programs/[id]/weeks/[weekId]/route.ts  # New: single week operations
app/api/program-assignments/route.ts       # Update to include current week
lib/api/workouts.ts                        # Update queries for week filtering
app/trainer/programs/[id]/page.tsx         # Week management UI
app/client/programs/[id]/page.tsx          # Week-grouped workout display
```

---

## Testing Checklist

### Button Fixes
- [ ] Client can start a workout from their program
- [ ] Client can view workout session after starting
- [ ] Trainer can add workouts to a program
- [ ] Trainer can remove workouts from a program
- [ ] Session completion syncs to sheets

### Week/Periodization
- [ ] Trainer can create weeks for a program
- [ ] Trainer can assign workouts to specific weeks
- [ ] Trainer can reorder weeks
- [ ] Client sees workouts grouped by week
- [ ] Client sees "current week" highlighted
- [ ] Week progress persists across sessions
