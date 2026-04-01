# SPEC.md - Option C: Clerk ID Standardization

## Executive Summary

The codebase suffers from an **IDENTITY CRISIS** where Clerk IDs and Database CUIDs are mixed inconsistently across API routes, frontend pages, and authorization checks. This document specifies the complete fix.

---

## Part 1: The Problem

### 1.1 ID Identity Crisis

**Three conflicting identity systems:**

| Source | Field | Example Value |
|--------|-------|---------------|
| Clerk Auth | `user.id` (Clerk's) | `user_30i7HVsu07CLHiXWSnDQv1BmVKz` |
| Database `User` table | `User.id` | `cmnc6zhqe00006k3h9gg2pm2c` |
| Database `User` table | `User.clerkId` | `user_30i7HVsu07CLHiXWSnDQv1BmVKz` |

**The `getCurrentUser()` function returns a DB User record where:**
- `user.id` = CUID (internal database ID)
- `user.clerkId` = Clerk ID (external identifier)

### 1.2 Where `user.id` is Used (Correctly vs Incorrectly)

**CORRECT uses (CUID used for DB operations):**
- `app/dashboard/workouts/[workoutId]/edit/page.tsx:53` - `userId: user.id` → correct CUID
- `app/trainer/layout.tsx:23` - `userId: user.id` → correct CUID
- `app/api/workout-sessions/route.ts:55` - `userId: user.id` → correct CUID

**INCORRECT/BUGGY uses:**
- `app/api/users/[userId]/activities/route.ts:24,71` - `organizationId: params.userId` → BUG: treats user ID as organization ID
- `app/api/users/[userId]/dashboard/route.ts:36` - `organizationId: params.userId` → BUG: same issue
- `app/api/users/[userId]/workouts/route.ts` - `params.userId` used directly without clerkId resolution in some paths

### 1.3 API Routes: Mixed Conventions for `params.userId`

**Routes that CORRECTLY look up by Clerk ID first:**
| File | Pattern |
|------|---------|
| `app/api/users/[userId]/goals/route.ts:20` | `db.user.findUnique({ where: { clerkId: params.userId } })` |
| `app/api/users/[userId]/meals/route.ts:30,112` | `db.user.findUnique({ where: { clerkId: params.userId } })` |
| `app/api/users/[userId]/role/route.ts:21` | `user.clerkId !== params.userId` |
| `app/api/users/[userId]/workouts/[workoutId]/route.ts:20` | `db.user.findUnique({ where: { clerkId: params.userId } })` |

**Routes that INCORRECTLY use `params.userId` directly as DB CUID:**
| File | Issue |
|------|-------|
| `app/api/users/[userId]/students/route.ts:19,63` | `user.id !== params.userId` - compares CUID to Clerk ID (never matches when viewing own data) |
| `app/api/users/[userId]/coach/route.ts:19,64` | `user.id !== params.userId` - same issue |
| `app/api/users/[userId]/activities/route.ts:24,71` | `organizationId: params.userId` - BUG: treats user Clerk ID as organization ID |
| `app/api/users/[userId]/dashboard/route.ts:36` | `organizationId: params.userId` - BUG: same issue |
| `app/api/users/[userId]/workouts/route.ts` | `params.userId` used in `programAssignment` and `workout` queries without clerkId resolution |

### 1.4 Role System Chaos

**Three competing role systems:**

| System | Field | Values | Used By |
|--------|-------|-------|---------|
| `User.role` | `User.role` | `"user"`, `"coach"` | `requireCoach()`, various API routes |
| `OrganizationMember.role` | `OrganizationMember.role` | `"owner"`, `"trainer"`, `"client"` | Most API authorization checks |
| `Clerk publicMetadata.role` | `user.publicMetadata?.role` | `"user"`, `"coach"` | Frontend pages only |

**Access control checks that use the WRONG system:**

| File | Check | Issue |
|------|-------|-------|
| `app/api/users/[userId]/students/route.ts:58` | `user.role !== "coach"` | Should check `OrganizationMember.role` |
| `app/api/users/[userId]/coach/route.ts:110` | `coach.role !== "coach"` | Should check `OrganizationMember.role` |
| `app/dashboard/coaching/page.tsx:78,95` | `user.publicMetadata?.role` | Frontend-only check, not enforced server-side |
| `app/dashboard/coaching/students/[studentId]/activities/[activityId]/settings/page.tsx:59` | `currentUser.role !== "coach"` | Should check `OrganizationMember` |
| `lib/auth-utils.ts:38` | `user.role !== "coach"` | `requireCoach()` uses `User.role`, not `OrganizationMember.role` |
| `lib/api/activities.ts:86` | `user.role === "coach"` | Uses `User.role` instead of `OrganizationMember` |

---

## Part 2: The Solution

### 2.1 Core Principle

> **Clerk ID is THE external identifier.** Use Clerk IDs everywhere externally (URLs, API params). Resolve to DB CUID only when needed for internal database operations.

### 2.2 Standardization Convention

**URLs and API params:** ALWAYS use Clerk ID
```
/api/users/user_xxx/workouts     ✓ CORRECT
/api/users/cmncxxx/workouts       ✗ WRONG
```

**Database operations:** Use DB CUID via clerkId resolution
```typescript
// Every API route MUST resolve params.userId (Clerk ID) to DB User first
const targetUser = await db.user.findUnique({
  where: { clerkId: params.userId }
})
if (!targetUser) return NextResponse("User not found", { status: 404 })

// Then use targetUser.id (CUID) for all subsequent DB operations
```

### 2.3 Utility Functions to Create

Create `lib/api/id-utils.ts`:

```typescript
import { db } from "@/lib/db"

/**
 * Resolve Clerk ID to DB User record.
 * Use when you have a Clerk ID from URL params or auth context.
 */
export async function resolveClerkIdToUser(clerkId: string) {
  return await db.user.findUnique({
    where: { clerkId },
    select: { id: true, clerkId: true, role: true, name: true, email: true }
  })
}

/**
 * Resolve Clerk ID to DB User CUID only.
 * Use when you just need the internal ID for database queries.
 */
export async function resolveClerkIdToCuid(clerkId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true }
  })
  return user?.id ?? null
}

/**
 * Get OrganizationMember for a user within an organization.
 * This is THE way to check user roles for access control.
 */
export async function getUserOrgMembership(
  userId: string, // DB CUID
  organizationId: string
) {
  return await db.organizationMember.findFirst({
    where: { userId, organizationId },
    select: { id: true, role: true, organizationId: true }
  })
}

/**
 * Get all OrganizationMemberships for a user (across all orgs).
 */
export async function getUserMemberships(userId: string) {
  return await db.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true, role: true }
  })
}

/**
 * Check if user has coach/trainer/owner role in ANY organization.
 * This replaces checks on User.role === "coach"
 */
export async function isCoach(userId: string): Promise<boolean> {
  const membership = await db.organizationMember.findFirst({
    where: {
      userId,
      role: { in: ["owner", "trainer", "coach"] }
    }
  })
  return membership !== null
}

/**
 * Validate that the requesting user can access the target user's data.
 * Returns the resolved target user or null if access denied.
 */
export async function validateUserAccess(
  requestingUserId: string, // DB CUID of authenticated user
  targetClerkId: string     // Clerk ID from URL param
): Promise<{ authorized: boolean; targetUser?: Awaited<ReturnType<typeof resolveClerkIdToUser>> }> {
  // Resolve target Clerk ID to DB user
  const targetUser = await resolveClerkIdToUser(targetClerkId)
  if (!targetUser) {
    return { authorized: false }
  }

  // Self-access is always allowed
  if (requestingUserId === targetUser.id) {
    return { authorized: true, targetUser }
  }

  // Check if requesting user is coach of target user
  const student = await db.user.findFirst({
    where: { id: targetUser.id, coachId: requestingUserId }
  })
  if (student) {
    return { authorized: true, targetUser }
  }

  // Check org membership - if same org and trainer/owner, allow access
  const requestingMemberships = await getUserMemberships(requestingUserId)
  const targetMemberships = await getUserMemberships(targetUser.id)

  for (const reqMem of requestingMemberships) {
    if (reqMem.role === "owner" || reqMem.role === "trainer") {
      // Check if target user is in same organization
      const inSameOrg = targetMemberships.some(
        tm => tm.organizationId === reqMem.organizationId
      )
      if (inSameOrg) {
        return { authorized: true, targetUser }
      }
    }
  }

  return { authorized: false }
}
```

### 2.4 Role System Fix

**ONE source of truth: `OrganizationMember.role`**

| Context | Check | Replacement |
|---------|-------|------------|
| Coach access for multi-tenant | `User.role === "coach"` | `OrganizationMember.role in ["owner", "trainer", "coach"]` |
| Trainer/Owner access | `User.role` | `OrganizationMember.role in ["owner", "trainer"]` |
| Backend role checks | `user.role` from `requireAuth()` | New `requireOrgRole(["owner", "trainer"])` utility |
| Frontend role display | `user.publicMetadata?.role` | N/A (decorative only) |
| `Clerk publicMetadata.role` | Used in webhooks | Keep for Clerk-side reference, NOT for backend access control |

**New auth utility `lib/auth-utils.ts` additions:**

```typescript
/**
 * Require user to have specific organization role(s).
 * Must be called after requireAuth().
 */
export async function requireOrgRole(roles: string | string[]) {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user

  const roleArray = Array.isArray(roles) ? roles : [roles]

  // Get user's organization memberships
  const memberships = await db.organizationMember.findMany({
    where: { userId: user.id },
    select: { role: true }
  })

  const hasRole = memberships.some(m => roleArray.includes(m.role))

  if (!hasRole) {
    return new NextResponse("Forbidden - Insufficient organization role", { status: 403 })
  }

  return user
}

/**
 * Check if user is a coach (owner/trainer/coach in any org).
 * Use for UI decisions, not access control.
 */
export async function isCoachUser(userId: string): Promise<boolean> {
  const membership = await db.organizationMember.findFirst({
    where: {
      userId,
      role: { in: ["owner", "trainer", "coach"] }
    }
  })
  return membership !== null
}
```

---

## Part 3: Complete File Audit

### 3.1 API Routes - Files Requiring Changes

#### `app/api/users/[userId]/route.ts`
**Problem:** Compares `params.userId` (Clerk ID) with `user.id` (CUID) on line 28
```typescript
// CURRENT (BUGGY):
if (params.userId === user.id) {
```
**Fix:** Resolve Clerk ID first
```typescript
// FIXED:
const targetUser = await db.user.findUnique({
  where: { clerkId: params.userId }
})
if (!targetUser) return new NextResponse("User not found", { status: 404 })
if (targetUser.id === user.id) { ... }
```

#### `app/api/users/[userId]/activities/route.ts`
**Problem:** Uses `organizationId: params.userId` (BUG - treats user ID as org ID)
**Lines 24, 71:** `organizationId: params.userId` → WRONG
**Fix:** Remove the buggy org check, use proper authorization pattern

#### `app/api/users/[userId]/dashboard/route.ts`
**Problem:** Same bug as activities route - `organizationId: params.userId`
**Line 36:** `organizationId: params.userId` → WRONG
**Fix:** Use `validateUserAccess()` utility

#### `app/api/users/[userId]/students/route.ts`
**Problem:** Compares Clerk ID with CUID
**Line 19, 63:** `user.id !== params.userId` → BUG (never matches when self-accessing)
**Fix:** Use `validateUserAccess()` utility or resolve clerkId first

#### `app/api/users/[userId]/coach/route.ts`
**Problem:** Uses `user.id !== params.userId` comparison then queries by `id: params.userId`
**Lines 19, 64:** `user.id !== params.userId` → BUG
**Lines 25, 74, 117:** `id: params.userId` → Wrong (should look up by clerkId)
**Fix:** Resolve clerkId first, then compare CUIDs

#### `app/api/users/[userId]/workouts/route.ts`
**Problem:** Uses `params.userId` directly in `authorizeWorkoutAccess()` without clerkId resolution
**Lines 82, 87, 102, 111, 151, 190, 206:** `params.userId` passed to `authorizeWorkoutAccess`
**Fix:** Resolve clerkId before calling `authorizeWorkoutAccess`

#### `app/api/users/[userId]/workouts/[workoutId]/route.ts`
**Problem:** Line 32 compares CUID with Clerk ID
```typescript
if (currentUser.id === params.userId) {  // BUG: compares CUID to Clerk ID
```
**Fix:** Resolve clerkId first

#### `app/api/users/[userId]/goals/route.ts`
**Problem:** Line 40 compares Clerk ID with CUID
```typescript
if (params.userId !== currentUser.id && !student) {  // BUG
```
**Fix:** Compare resolved targetUser.id with currentUser.id

#### `app/api/users/[userId]/meals/route.ts`
**Problem:** Line 46 compares Clerk ID with CUID
```typescript
if (currentUser.id === params.userId) {  // BUG
```
**Fix:** Compare resolved targetUser.id with currentUser.id

### 3.2 Frontend Pages - Files Requiring Changes

#### `app/dashboard/coaching/page.tsx`
**Problem:** Inconsistent ID resolution
- `currentUserDbId` resolved via `/api/users/me` (DB CUID)
- `students[].id` is DB CUID from `/api/users/${currentUserDbId}/students`
- But later passes `userId` (Clerk ID from `useUser()`) to components
**Lines to audit:** 63, 92-110 (student fetch and data passing)

#### `app/dashboard/coaching/students/[studentId]/workouts/page.tsx`
**Problem:** `params.studentId` used directly - needs verification of ID format
**Line 69:** `fetch('/api/users/${params.studentId}/workouts')` - assumes DB CUID
**Fix:** If studentId is Clerk ID, no change needed (goals/meals routes look up by clerkId). If DB CUID, needs clerkId lookup first.

#### `app/dashboard/coaching/students/[studentId]/goals/page.tsx`
**Problem:** `params.studentId` in URL - API expects Clerk ID (route does `clerkId: params.userId`)
**Lines 67, 75, 92, 110, 129, 161:** Uses `params.studentId`
**Status:** Should work IF `params.studentId` is Clerk ID (route looks up by clerkId)

#### `components/coach/StudentDataDashboard.tsx`
**Problem:** Uses `selectedStudent.clerkId` for API calls - THIS IS CORRECT
**Lines 117-135:** Uses `selectedStudent.clerkId` for meals, workouts, activities, dashboard
**Status:** This component is correct - it uses Clerk ID consistently

#### `components/coach/ClientSelector.tsx`
**Problem:** `coachId` prop is Clerk ID but used as DB CUID internally
**Lines 74-77:** Resolves DB CUID via `/api/users/me` but `coachId` prop is Clerk ID
**Line 91:** `currentUserDbId` (CUID) used in `/api/users/${currentUserDbId}/students`

### 3.3 Library Files - Files Requiring Changes

#### `lib/auth-utils.ts`
**Problem:** `requireCoach()` uses `User.role`, not `OrganizationMember.role`
**Line 38:** `if (user.role !== "coach")` → WRONG source of truth
**Fix:** Add `requireOrgRole()` and deprecate `requireCoach()`

#### `lib/api/activities.ts`
**Problem:** `verifyActivity()` uses `user.role === "coach"`, line 86
**Line 86:** `if (user.role === "coach")` → Should check `OrganizationMember`
**Fix:** Use `isCoach()` utility

### 3.4 Dashboard Layouts - Files Requiring Changes

#### `app/dashboard/layout.tsx`
**Problem:** Line 31 `where: { id: user.id }` is correct (user.id is CUID)
BUT: Lines 22-34 check `organizationMember.findFirst({ userId: user.id })` which is correct
**Status:** This file appears correct

#### `app/trainer/layout.tsx`
**Problem:** Line 30 `where: { id: user.id }` is correct
**Status:** This file appears correct

#### `app/dashboard/workouts/[workoutId]/edit/page.tsx`
**Problem:** Line 47 `getWorkout(params.workoutId, user.id)` passes user.id (CUID) - correct
BUT: Line 53 `userId: user.id` used in `organizationMember.findFirst` - correct
**Status:** This file appears correct

#### `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`
**Problem:** Line 32 queries `organizationMember.findFirst({ userId: dbUser.id })` but `dbUser` was found via `clerkId: user.id`
**Lines 35, 89:** `dbUser.id` vs `user.id` confusion
**Status:** Needs audit - may be correct but confusing naming

---

## Part 4: Migration Plan

### Phase 1: Create Utilities (Day 1)
1. Create `lib/api/id-utils.ts` with clerk ID resolution functions
2. Update `lib/auth-utils.ts` with `requireOrgRole()` and deprecate `requireCoach()`
3. Test utilities in isolation

### Phase 2: Fix API Routes (Day 1-2)
1. Fix `app/api/users/[userId]/activities/route.ts` - REMOVE buggy `organizationId` checks
2. Fix `app/api/users/[userId]/dashboard/route.ts` - Same fix
3. Fix all other `app/api/users/[userId]/*.ts` routes to resolve clerkId first
4. Update `lib/api/activities.ts` to use `isCoach()` utility

### Phase 3: Fix Role Checks (Day 2)
1. Replace `User.role === "coach"` checks with `OrganizationMember.role` checks
2. Update `lib/auth-utils.ts` `requireCoach()` to check `OrganizationMember`
3. Audit all files for `user.role` checks

### Phase 4: Frontend Consistency (Day 2-3)
1. Audit `components/coach/ClientSelector.tsx` for ID confusion
2. Verify all pages use consistent ID format (Clerk ID in URLs)
3. Update `app/dashboard/coaching/page.tsx` if needed

### Phase 5: Testing (Day 3)
1. Test as bmp19076 (Coach Kevin) - verify all coach features
2. Test as kvnmiller11 (Client) - verify client features
3. Verify video selector appears for coach
4. Verify client management works for coach
5. Verify no redirects to /dashboard

---

## Part 5: Files Summary Table

| File | Status | Priority | Change Required |
|------|--------|----------|-----------------|
| `lib/api/id-utils.ts` | NEW | CRITICAL | Create with clerkId resolution utilities |
| `lib/auth-utils.ts` | MODIFY | CRITICAL | Add `requireOrgRole()`, deprecate `requireCoach()` |
| `app/api/users/[userId]/activities/route.ts` | BUGGY | CRITICAL | Remove buggy `organizationId` checks, use proper auth |
| `app/api/users/[userId]/dashboard/route.ts` | BUGGY | CRITICAL | Same fix as activities |
| `app/api/users/[userId]/route.ts` | BUGGY | HIGH | Resolve clerkId before comparison |
| `app/api/users/[userId]/students/route.ts` | BUGGY | HIGH | Use `validateUserAccess()` |
| `app/api/users/[userId]/coach/route.ts` | BUGGY | HIGH | Resolve clerkId, fix comparisons |
| `app/api/users/[userId]/workouts/route.ts` | BUGGY | HIGH | Resolve clerkId before `authorizeWorkoutAccess()` |
| `app/api/users/[userId]/workouts/[workoutId]/route.ts` | BUGGY | HIGH | Fix CUID vs Clerk ID comparison |
| `app/api/users/[userId]/goals/route.ts` | BUGGY | MEDIUM | Fix comparison |
| `app/api/users/[userId]/meals/route.ts` | BUGGY | MEDIUM | Fix comparison |
| `lib/api/activities.ts` | BUGGY | HIGH | Use `isCoach()` instead of `User.role` |
| `components/coach/ClientSelector.tsx` | CONFUSING | MEDIUM | Clarify ID handling |
| `app/dashboard/coaching/page.tsx` | CONFUSING | MEDIUM | Audit ID consistency |
| `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx` | CONFUSING | LOW | Rename variables for clarity |
| `app/dashboard/layout.tsx` | OK | - | No change needed |
| `app/trainer/layout.tsx` | OK | - | No change needed |
| `app/dashboard/workouts/[workoutId]/edit/page.tsx` | OK | - | No change needed |

---

## Part 6: Quality Gates

- **CRITICAL issues:** 0 allowed (API auth bugs, data corruption risks)
- **HIGH issues:** 0 allowed (broken features, wrong data returned)
- **MEDIUM issues:** < 3 allowed (inconsistent patterns, confusing code)
- Keep looping until gates pass

## Success Criteria

1. ✅ ALL API routes use Clerk ID as external identifier in URLs
2. ✅ ALL database lookups resolve Clerk ID → DB CUID before querying
3. ✅ `OrganizationMember.role` is THE source of truth for access control
4. ✅ Coach Kevin (bmp19076) can see all coach features
5. ✅ Client kvnmiller11 sees only client features
6. ✅ No more "user.id vs clerkId" confusion
7. ✅ Video selector appears for coach
8. ✅ Client management works for coach
9. ✅ No redirects to /dashboard for authorized users
