# Review Report - Loop 3

## Issues Found

### 🔴 Critical Issues

#### 1. Authorization Bug: Trainers Cannot Add Workouts to Programs
**File:** `app/api/programs/[id]/route.ts:91` (PATCH handler)

```javascript
if (!membership || membership.role !== "owner") {
  return new Response("Forbidden", { status: 403 })
}
```

**Problem:** Only "owner" role can update programs, but the trainer UI (`/trainer/programs/[id]/page.tsx`) is used by trainers who may have "trainer" role. Trainers will receive 403 when trying to add/remove workouts.

**Fix:** Change to allow both "owner" and "trainer" roles:
```javascript
if (!membership || !["owner", "trainer"].includes(membership.role)) {
```

---

#### 2. Race Condition in Add Workouts Dialog
**File:** `app/trainer/programs/[id]/page.tsx:145-165`

```javascript
async function saveWorkouts() {
  // ...
  const currentWorkoutIds = program.workouts.map(w => w.id)
  const allWorkoutIds = [...currentWorkoutIds, ...selectedWorkoutIds]
  // ...
  const res = await fetch(`/api/programs/${program.id}`, {
    method: "PATCH",
    body: JSON.stringify({ workoutIds: allWorkoutIds }),
  })
```

**Problem:** Uses read-then-write pattern. If two trainers have the dialog open, or if the user opens in two tabs, the second save overwrites the first. No optimistic locking or version checking.

**Fix:** Use `PATCH` to append/remove specific workouts server-side, or implement ETags/version checking.

---

### 🟠 Medium Issues

#### 3. No Verification That Workouts Belong to Organization
**File:** `app/api/programs/[id]/route.ts:105-111`

```javascript
if (body.workoutIds !== undefined) {
  await db.workout.updateMany({
    where: { id: { in: body.workoutIds } },
    data: { programId: params.id },
  })
}
```

**Problem:** API doesn't verify workouts belong to the trainer's organization. A malicious actor could add any workout ID (they don't own) to their program. The UI filters this, but the API is unprotected.

**Fix:** Add validation:
```javascript
const workouts = await db.workout.findMany({
  where: { id: { in: body.workoutIds } },
  select: { id: true, userId: true }
})
// Verify all workouts belong to same org or user
```

---

#### 4. Error Responses Not JSON
**File:** `app/api/workout-sessions/route.ts:67`
**File:** `app/api/workout-sessions/[sessionId]/route.ts:158,184`

```javascript
return new Response(null, { status: 500 })
```

**Problem:** Returns empty body with 500 status. Client error handling will fail trying to parse JSON.

**Fix:**
```javascript
return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
```

---

#### 5. "Unassigned" Week 0 Displayed to Users
**File:** `app/client/programs/[id]/page.tsx`

```javascript
const weekNames: Record<number, string> = {
  0: "Unassigned",
}
```

**Problem:** Workouts with `weekNumber = null` get grouped as week 0 and shown as "Unassigned". This might confuse users who expect clean week numbers only.

**Fix:** Either filter out null week workouts from display, or handle them separately without week grouping.

---

#### 6. Remove Workout Has No Confirmation
**File:** `app/trainer/programs/[id]/page.tsx:183-200`

```javascript
<Button variant="ghost" size="sm" onClick={() => removeWorkout(workout.id)}>
  Remove
</Button>
```

**Problem:** No confirmation dialog. Accidental clicks will remove workouts from the program.

**Fix:** Add a confirmation dialog or use a more explicit action (e.g., icon + "Remove" with hover state).

---

### 🟡 Minor Issues

#### 7. Duplicate Import
**File:** `app/api/workout-sessions/route.ts:1`

```javascript
import { z } from "zod"  // ← at top
// ...later in file...
import { z } from "zod"  // ← duplicate, line 68
```

The file has `import { z } from "zod"` at line 1 AND line 68. This works but is redundant.

---

#### 8. ESLint Warnings (Pre-existing)
- `img` elements without `alt` props in admin pages
- `useEffect` missing dependency in `todays-activities.tsx`

Not introduced by this loop, but should be fixed eventually.

---

## Week Filtering Logic Review

The week filtering in `app/api/workouts/program/[programId]/route.ts` is correctly implemented:
- ✅ Parses `week` query param as integer
- ✅ Validates with `isNaN` check
- ✅ Groups by week when no filter applied
- ✅ Returns proper response shape with `groupedByWeek`

The client-side week filter in `app/client/programs/[id]/page.tsx` is also correct:
- ✅ Week filter buttons render when multiple weeks exist
- ✅ Correctly filters displayed workouts
- ✅ Shows "All Weeks" option

---

## Security Review

| Check | Status |
|-------|--------|
| SQL Injection (Prisma parameterized) | ✅ Safe |
| XSS (React auto-escapes) | ✅ Safe |
| Authorization checks present | ✅ Safe |
| AuthZ logic correctness | ⚠️ Partial (trainer role issue) |
| Input validation (Zod schemas) | ✅ Safe |
| Error info leakage | ⚠️ Returns 500 with no body |

---

## Build Status

```
✅ TypeScript compilation: PASSED
⚠️ ESLint warnings: 4 warnings (pre-existing, not from this loop)
✅ Prisma generate: PASSED
✅ Next.js build: PASSED
```

---

## Quality Score: 5/10

**Reasoning:**
- Core functionality works (week filtering, button fixes)
- But critical authorization bug breaks trainer workflow
- Race condition can cause data loss
- Multiple medium issues affect UX and security
- Error handling is inconsistent

---

## Production Ready: NO

**Must fix before production:**
1. Authorization bug (issue #1) - trainers literally cannot use the main feature
2. Error responses not JSON (issue #4) - will break client error handling
3. Race condition (issue #2) - can cause data loss in concurrent use

**Should fix before production:**
4. Workout organization validation (issue #3) - security concern
5. Remove confirmation (issue #6) - prevents accidental deletions
6. "Unassigned" display (issue #5) - UX clarity
