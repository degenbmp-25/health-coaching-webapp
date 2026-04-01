# Review Report: Video Selector Bug Fixes

**Date:** 2026-04-01
**Reviewer:** Reviewer Agent
**Files Reviewed:**
1. `app/dashboard/workouts/[workoutId]/edit/page.tsx`
2. `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`
3. `app/trainer/layout.tsx`
4. `app/dashboard/layout.tsx`
5. `components/workout/workout-edit-form.tsx`

---

## CRITICAL Issues

### CRITICAL #1: TypeScript Error — `membership` Possibly Null in Student Edit Page
**File:** `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`  
**Line:** ~100

```typescript
organizationId: membership.organizationId,
```

The variable `membership` is typed as `Prisma.OrganizationMemberFindFirstResult | null`, but it's accessed without optional chaining on line 100 inside the `organizationVideo.findMany` call. Since the preceding `if` condition allows `dbUser?.role === 'coach'` without any membership, `membership` can legitimately be null here — and the code will crash with a null pointer error at runtime.

**Fix:**
```typescript
organizationVideos = membership
  ? await db.organizationVideo.findMany({
      where: {
        organizationId: membership.organizationId,
        status: 'ready'
      },
      orderBy: { createdAt: 'desc' }
    })
  : []
```

**OR** use optional chaining:
```typescript
organizationId: membership?.organizationId,
```
But this is inferior since `undefined` in a Prisma `where` clause may behave unexpectedly (filter by `undefined` vs no filter). Use the conditional approach above.

---

### CRITICAL #2: `organizationId: undefined` Passed to Prisma in Trainer Layout
**File:** `app/trainer/layout.tsx` and `app/dashboard/layout.tsx`

When `dbUser?.role === 'coach'` is true but `membership` is null (coach without org membership), the code falls through to `organizationVideo.findMany` with `organizationId: undefined`. Prisma's behavior with `undefined` in a `where` clause is implementation-defined — it may silently return zero results, return all results across all orgs, or throw a type error depending on schema config.

This is not a guaranteed crash but is **silent data corruption** — the wrong videos (or no videos) could be returned.

**Fix:** Same as CRITICAL #1 — guard the `findMany` call with a membership check:

```typescript
if (membership || dbUser?.role === 'coach') {
  isTrainer = true
  if (membership) {
    organizationVideos = await db.organizationVideo.findMany({
      where: {
        organizationId: membership.organizationId,
        status: 'ready'
      },
      orderBy: { createdAt: 'desc' }
    })
  }
  // If coach but no membership, isTrainer=true but no videos (graceful)
}
```

---

## HIGH Issues

### HIGH #1: Dangerous Fallback in Error Handler
**Files:** `app/trainer/layout.tsx`, `app/dashboard/layout.tsx`

```typescript
} catch (error) {
  console.error("Error checking trainer access:", error)
  canAccessTrainer = true  // DANGEROUS
}
```

If the database check fails for **any reason** (network blip, schema change, temporary unavailability), `canAccessTrainer` is set to `true`. This could expose the trainer UI to users who should not have access.

**Fix:**
```typescript
} catch (error) {
  console.error("Error checking trainer access:", error)
  // Deny access on error — fail secure, not open
  canAccessTrainer = false
}
```

Or at minimum, set it to `false` and log for alerting.

---

### HIGH #2: `let organizationVideos: any[]` — No Type Safety
**File:** `app/dashboard/workouts/[workoutId]/edit/page.tsx`

The variable `organizationVideos` is typed as `any[]`, which:
1. Bypasses TypeScript's type checking for the video data
2. Prevents compile-time detection of issues when passing videos to `WorkoutEditForm`
3. Masks potential mismatches between the API response shape and expected props

**Fix:** Define and use a proper interface:
```typescript
interface OrganizationVideo {
  id: string
  organizationId: string
  muxAssetId: string
  muxPlaybackId: string | null
  title: string
  thumbnailUrl: string | null
  duration: number | null
  status: string
  createdAt: Date
  updatedAt: Date
}

let organizationVideos: OrganizationVideo[] = []
```

The `workout-edit-form.tsx` already has a proper `OrganizationVideo` interface — this same type should be shared.

---

## MEDIUM Issues

### MEDIUM #1: Duplicate Video Selector Value Risk (Not Fully Fixed)
**File:** `components/workout/workout-edit-form.tsx`

The spec explicitly called for changing the video selector to store `video.id` internally and resolve `muxPlaybackId` on save to prevent collision if two videos share the same `muxPlaybackId`. The implemented fix only adds the `muxPlaybackId != null` filter, which is correct for the immediate bug but does not address the spec's Phase 3 recommendation.

**Risk:** If two `OrganizationVideo` records somehow share the same `muxPlaybackId` (duplicate Mux assets), the `<SelectItem>` values would be duplicated, causing undefined select behavior.

**Fix (deferred):** This was acknowledged as "Phase 3" in the spec and the quick fix is sufficient for now. Document this as a known limitation.

---

### MEDIUM #2: No Loading/Error State for Videos
**File:** `components/workout/workout-edit-form.tsx`

The `WorkoutEditForm` receives `videos` as a prop and immediately filters them. If the videos prop is still loading (undefined), it would be treated as `[]` via the default. However, if an error occurred fetching videos, the component silently shows an empty video list with no indication to the user.

**Fix:** Add prop validation or a `videosLoading` prop to show a skeleton/loading state for the video selector.

---

### MEDIUM #3: Inconsistent Error Handling Between Edit Pages
**File:** Both edit pages

The regular workout edit page (`[workoutId]/edit/page.tsx`) wraps the membership check in a try/catch but doesn't set a fallback — if the `db.user.findUnique` fails, `dbUser` is `null` and the coach role check silently fails. The student edit page doesn't wrap the membership check in try/catch at all and could throw on DB errors.

**Fix:** Unify error handling in both pages. Use the same pattern:
```typescript
let isTrainer = false
let organizationVideos: OrganizationVideo[] = []

try {
  const dbUser = await db.user.findUnique({...})
  const membership = await db.organizationMember.findFirst({...})
  
  if (membership || dbUser?.role === 'coach') {
    isTrainer = true
    if (membership) {
      organizationVideos = await db.organizationVideo.findMany({...})
    }
  }
} catch (error) {
  console.error("Error loading trainer data:", error)
  // fail open or closed based on security posture
}
```

---

## LOW Issues

### LOW #1: Redundant `dbUser` Fetch in Student Edit Page
**File:** `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`

The `dbUser` fetch is used first for the role redirect check (`if (dbUser?.role !== "coach")`), then again in the membership check. The two checks could be combined to reduce a DB round-trip.

---

### LOW #2: No "No Videos" State in Edit Page
**File:** `app/dashboard/workouts/[workoutId]/edit/page.tsx`

When `isTrainer` is true but `organizationVideos` is empty (either because the coach has no org membership or the org has no videos), the `WorkoutEditForm` receives an empty array. The form shows "No videos yet. Upload one" in the video selector, but the user can't upload from the edit page. A link to `/trainer/videos` is present in the form, which is helpful — but the edit page itself could show a banner if the user is a trainer but has no videos.

---

### LOW #3: Magic String `'coach'` Duplicated 3+ Times
**Files:** All 4 files

The string `'coach'` appears multiple times in each file. If the coach role name ever changes in the database enum, it would need to be updated in many places. Extract to a constant:
```typescript
const COACH_ROLE = 'coach' as const
const TRAINER_ROLE = 'trainer' as const
// etc.
```

---

## TypeScript Build Status

**TypeScript check:** `npx tsc --noEmit`
- **Test files:** Multiple errors (missing `weekNumber`/`dayOfWeek` fields in mock workout data) — pre-existing, unrelated to this PR
- **Source files:** 1 error — `membership` possibly null in `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx` line 100

---

## Security Assessment

| Check | Status |
|-------|--------|
| SQL Injection | ✅ Safe — Prisma ORM used throughout |
| XSS | ✅ Safe — no user input rendered unsanitized |
| Credential Exposure | ✅ Safe — no credentials in code |
| Authorization Bypass | ⚠️ Partial — Error fallback sets `canAccessTrainer = true` (HIGH #1) |
| IDOR | ✅ Safe — server-side checks on workout ownership |

---

## Quality Score

**6.5 / 10**

**Reasoning:**
- The core bugs (coach role check, null muxPlaybackId filter) are correctly fixed
- CRITICAL #1 (TypeScript error, will crash) must be fixed before deployment
- CRITICAL #2 (undefined orgId to Prisma) is a silent data issue that could cause wrong behavior
- HIGH #1 (error fallback = true) is a security concern
- The spec's Phase 3 improvement was not implemented (acknowledged as deferred)

---

## Production Ready

**NO**

**Blocking issues:**
1. CRITICAL #1 — TypeScript compilation error (will crash at runtime)
2. CRITICAL #2 — `undefined` passed as `organizationId` to Prisma (silent wrong behavior)
3. HIGH #1 — Error handler grants trainer access on any DB failure (security)

**Required before merge:** Fix all CRITICAL and HIGH issues. The video selector will work correctly for the happy path but is not production-safe in its current state.

---

## Summary

The implementation correctly addresses the spec's Problem 1 (coach role check) and Problem 2 (null muxPlaybackId filter) for the happy path. However, three issues introduce runtime failures or security concerns that must be fixed:

1. **Fix the null check on `membership`** in the student edit page — it will crash
2. **Guard the `organizationVideo.findMany` calls** with a membership check in all 4 files — undefined Prisma where clause is unsafe
3. **Change error fallback to `canAccessTrainer = false`** — fail secure, not open

The code is functional for the intended coach-with-membership scenario but has edge cases that would cause crashes or security issues in production.
