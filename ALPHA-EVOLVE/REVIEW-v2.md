# ALPHA-EVOLVE Review v2 — multi-tenant-v1

## Executive Summary

**Quality Score: 5/10**  
**Production Ready: NO**

The 4 fixes from Bug-Fix Agent were correctly applied to the primary affected files. TypeScript compiles clean. However, **2 new CRITICAL bugs** were discovered in related API routes that have the same `clerkId` vs database ID mismatch — these block the coaching dashboard's goals and workouts features. Additionally, the trainer client detail page expects data the API never returns.

---

## Fix Verification

### ✅ CRITICAL #1: removeMember() route fix
**File:** `app/admin/organizations/[id]/page.tsx:47`  
**Status:** FIXED CORRECTLY

```typescript
const res = await fetch(`/api/organizations/${id}/members`, {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: memberId }),
})
```
API route at `app/api/organizations/[id]/members/route.ts` correctly uses `removeMemberSchema.parse(json)` (expects `{ userId }`). ✅

---

### ✅ CRITICAL #2: User lookup by database id
**File:** `app/api/users/[userId]/route.ts`  
**Status:** FIXED CORRECTLY (for the main user route only — see NEW ISSUES below)

Self-check now uses `params.userId === user.id` (db UUID). All `db.user.findUnique` calls use `where: { id: params.userId }`. ✅

---

### ✅ CRITICAL #3: Role check via OrganizationMember
**File:** `app/api/users/[userId]/route.ts`  
**Status:** FIXED CORRECTLY

Replaced `user.role === "coach"` check with proper `OrganizationMember` query:
```typescript
const requestingUserMembership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ["owner", "trainer"] },
  },
})
```
✅

---

### ✅ HIGH #1: Empty sheets directory removed
**File:** `app/admin/sheets/`  
**Status:** FIXED

`ls app/admin/sheets/` returns exit code 2 (not found). Directory confirmed removed. ✅

---

## New Issues Found

### CRITICAL NEW #1: Goals API still uses clerkId — coach goals pages broken

**Files:** `app/api/users/[userId]/goals/route.ts`

**Problem:** Goals route still compares `user.clerkId === params.userId` and queries `where: { clerkId: params.userId }`. But the frontend pages at `app/dashboard/coaching/students/[studentId]/goals/page.tsx` navigate using `student.id` (database UUID) and call `GET /api/users/${params.studentId}/goals`.

Result: `params.studentId` (db UUID) never equals `user.clerkId` (Clerk string). Goals never load.

**Fix needed:** Update goals route to use database IDs like the main `[userId]/route.ts` was fixed:
- `where: { userId: params.userId }` instead of `where: { clerkId: params.userId }`
- Remove `clerkId` comparison

**Severity:** CRITICAL — breaks coach goal management for students

---

### CRITICAL NEW #2: Workouts API still uses clerkId — coach workouts pages broken

**Files:** `app/api/users/[userId]/workouts/route.ts`

**Problem:** Same pattern as goals. Lines 52, 153: `currentUser.clerkId === params.userId`. Lines 40, 141: `where: { clerkId: params.userId }`. Frontend at `app/dashboard/coaching/students/[studentId]/workouts/page.tsx` passes db UUID via `params.studentId`.

Result: Workouts never load for coach's students.

**Fix needed:** Same as goals — update to use database IDs throughout.

**Severity:** CRITICAL — breaks coach workout management for students

---

### HIGH NEW #1: Trainer client detail page missing programAssignments/workoutSessions

**File:** `app/trainer/clients/[id]/page.tsx`

**Problem:** The trainer client detail page's `ClientData` interface expects:
```typescript
programAssignments: Array<{ id, program: { id, name, description, workouts }, startedAt }>
workoutSessions: Array<{ id, workout: { name }, status, completedAt, startedAt }>
```

But the fixed `[userId]/route.ts` GET handler only returns `{ id, name, email, image }` (and for trainer-accessed members: only the `user` fields from `OrganizationMember`). It never includes `programAssignments` or `workoutSessions` in any code path.

The User model in Prisma DOES have these relations. But the API route never `.include()` them.

**Result:** Trainer client detail page will render empty lists for program assignments and workout sessions even when data exists.

**Fix needed:** Add `include: { programAssignments: { include: { program: { include: { workouts: true } } } }, workoutSessions: true }` to the user lookup in the trainer access path of `[userId]/route.ts`.

**Severity:** HIGH — trainer feature is broken (empty data)

---

### HIGH NEW #2: CoachStudents interface missing clerkId field

**File:** `components/coach/CoachStudents.tsx`

**Problem:** `Student` interface only declares `{ id, name, email, image }` but the API returns `{ id, clerkId, name, email, image }`. The `clerkId` field exists in the API response but is silently ignored by TypeScript due to interface mismatch.

This is a type safety issue — the component loses access to `clerkId` which other parts of the codebase might still need.

**Fix needed:** Add `clerkId: string` to the `Student` interface in `CoachStudents.tsx`.

**Severity:** MEDIUM — type safety, not runtime crash

---

### MEDIUM: Coach role legacy check in students route

**File:** `app/api/users/[userId]/students/route.ts:32`

**Problem:** Uses `coach.role !== "coach"` (from User.role field) to gate access. In the multi-tenant model, trainer role is in `OrganizationMember.role`, not `User.role`. However, this is a legacy coach-specific endpoint separate from the multi-tenant trainer flow (`/trainer/clients/`). Whether this needs fixing depends on whether the `/dashboard/coaching/` flow is still actively used or is legacy.

**Assessment:** This route is used by the coaching dashboard which appears to be actively developed. Needs review to determine if it should use OrganizationMember or remain legacy.

**Severity:** MEDIUM — needs clarification on coach vs trainer architecture

---

## TypeScript Compilation

```
npx tsc --noEmit
EXIT CODE: 0 ✅
```

No type errors. The fixes did not introduce any new TypeScript errors.

---

## What Still Works

- Organization CRUD and member management (main flow)
- Trainer client list and assignment via multi-tenant model
- Sheet connections management (trainer + organization views)
- Clerk authentication and session management
- Prisma schema (multi-tenant models are well-designed)
- `app/api/users/[userId]/role/route.ts` — still correctly uses Clerk ID (called by coaching dashboard with `user.id` from Clerk session)
- `app/api/users/[userId]/students/route.ts` — still correctly uses Clerk ID (called by coaching dashboard with `user.id` from Clerk session)

---

## Priority Order for Next Fixes

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | Fix goals route to use database IDs | Low |
| 2 | Fix workouts route to use database IDs | Low |
| 3 | Add programAssignments/workoutSessions to user API | Medium |
| 4 | Add clerkId to CoachStudents interface | Trivial |
| 5 | Clarify coach vs trainer architecture | Design decision |

---

## Final Recommendation

**DO NOT MERGE** until CRITICAL NEW #1 and CRITICAL NEW #2 are fixed. These are functional bugs in the coaching dashboard that will cause blank screens for goals and workouts.

The good news: the fixes to the primary `[userId]/route.ts` were correct and the approach (switching from clerkId to database ID) is the right one. The same fix pattern needs to be applied to the goals and workouts sub-routes.

Once the 2 critical new bugs are fixed, HIGH NEW #1 (trainer data) should also be addressed before deployment since it breaks a key feature (trainer client detail view).

**Estimated fix effort:** 1-2 hours for all issues combined.
