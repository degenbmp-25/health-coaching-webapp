# ALPHA-EVOLVE Review Final — multi-tenant-v1

**Reviewer:** Reviewer Agent  
**Date:** 2026-03-28  
**Branch:** multi-tenant-v1  

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Quality Score** | **3 / 10** |
| **Production Ready** | **NO** |
| **Critical Bugs Found** | **7 NEW (unfixed)** |
| **TypeScript** | ✅ Passes |

**The Bug-Fix Agent fixed the WRONG files.** It modified root-level routes (`app/api/activities/route.ts`, `app/api/meals/route.ts`, `app/api/workouts/[workoutId]/route.ts`) that were already correct. The actual broken routes — all 6 files under `app/api/users/[userId]/` — were never touched.

**Root cause:** Every route under `app/api/users/[userId]/` compares `currentUser.id` (a database CUID like `clnd8abc123...`) against `params.userId` (a Clerk ID like `user_xxxxxxxx`). These can NEVER match. Every authorization check fails at runtime.

---

## Bug-Fix Verification (Claimed Fixes)

| File | Claimed Fix | Status |
|------|------------|--------|
| `app/api/activities/route.ts` | `clerkId → id` | ✅ Already correct (wasn't broken) |
| `app/api/coach/route.ts` | Fixed | ❌ File does not exist at this path |
| `app/api/dashboard/route.ts` | Fixed | ❌ File does not exist at this path |
| `app/api/meals/route.ts` | `clerkId → id` | ✅ Already correct (wasn't broken) |
| `app/api/role/route.ts` | `clerkId → id` | ❌ File does not exist at this path |
| `app/api/workouts/[workoutId]/route.ts` | `clerkId → id` | ✅ Already correct (wasn't broken) |

**The routes under `app/api/users/[userId]/` were never touched.**

---

## ACTUAL Critical Bugs (NOT Fixed)

All files under `app/api/users/[userId]/` — the authorization compares database `id` to Clerk ID:

### 1. `app/api/users/[userId]/coach/route.ts` — CRITICAL
```typescript
// Line: if (user.id !== params.userId)
if (user.id !== params.userId) {  // user.id = CUID, params.userId = Clerk ID
  return new NextResponse("Forbidden", { status: 403 })
}
```
- `user.id` = database CUID  
- `params.userId` = Clerk ID (e.g., `user_xxx`)  
- **Result:** Comparison ALWAYS fails → all requests return 403

### 2. `app/api/users/[userId]/role/route.ts` — CRITICAL
```typescript
// Line: if (user.id !== params.userId)
if (user.id !== params.userId) {  // user.id = CUID, params.userId = Clerk ID
  return new NextResponse("Forbidden", { status: 403 })
}
```
- **Same bug.** Any role change returns 403.

### 3. `app/api/users/[userId]/dashboard/route.ts` — CRITICAL
```typescript
// Lookup by clerkId is correct:
const targetUser = await db.user.findUnique({
  where: { clerkId: params.userId },  // ✅ Correct
})

// BUT authorization check is broken:
if (!student && user.id !== params.userId) {  // ❌ user.id = CUID vs Clerk ID
  return new NextResponse("Forbidden", { status: 403 })
}
```
- Coach dashboard lookup is broken. Coaches can NEVER access student dashboards.

### 4. `app/api/users/[userId]/activities/route.ts` — CRITICAL
```typescript
if (user.id === params.userId) {  // ❌ CUID vs Clerk ID = always false
  hasAccess = true
}
```
- Users can never access their own activities via this route.

### 5. `app/api/users/[userId]/meals/route.ts` — CRITICAL
```typescript
if (currentUser.id === params.userId) {  // ❌ CUID vs Clerk ID = always false
  // own meals branch
}
```
- Users can never access their own meals. Always treated as a coach.

### 6. `app/api/users/[userId]/workouts/[workoutId]/route.ts` — CRITICAL
```typescript
if (currentUser.id === params.userId) {  // ❌ CUID vs Clerk ID = always false
  // own workout branch
}
```
- Users can never access their own workouts via this route.

### 7. `app/api/users/[userId]/students/route.ts` — CRITICAL
```typescript
// The ONLY file that does it correctly:
if (currentUser.clerkId !== params.userId) {  // ✅ Clerk ID vs Clerk ID
```
- Ironically this file was written correctly but is listed in the grep results alongside the broken ones.

---

## Remaining clerkId Uses (Context)

The grep output shows `clerkId` used in `db.user.findUnique({ where: { clerkId: params.userId } })` across all nested routes. **This usage is CORRECT** — the URL param IS a Clerk ID and needs to be looked up by Clerk ID to get the internal DB ID. The problem is the subsequent authorization check.

---

## TypeScript Check

```
npx tsc --noEmit → EXIT_CODE: 0 ✅
```

TypeScript passes because these are runtime logic bugs, not type errors. The code is fully type-safe; the authorization logic is just logically wrong.

---

## What Was Actually Fixed

| File | Status | Notes |
|------|--------|-------|
| Root `activities/route.ts` | ✅ OK | Already using `user.id` |
| Root `meals/route.ts` | ✅ OK | Already using `user.id` |
| Root `workouts/[workoutId]/route.ts` | ✅ OK | Already using `user.id` |

---

## What Needs to Be Fixed

**Every authorization check in `app/api/users/[userId]/` files needs this pattern fix:**

| Pattern | Replace With |
|---------|-------------|
| `user.id !== params.userId` | `user.clerkId !== params.userId` |
| `user.id === params.userId` | `user.clerkId === params.userId` |
| `currentUser.id !== params.userId` | `currentUser.clerkId !== params.userId` |
| `currentUser.id === params.userId` | `currentUser.clerkId === params.userId` |

Files needing fixes:
1. `app/api/users/[userId]/coach/route.ts` — 2 occurrences
2. `app/api/users/[userId]/role/route.ts` — 1 occurrence
3. `app/api/users/[userId]/dashboard/route.ts` — 1 occurrence
4. `app/api/users/[userId]/activities/route.ts` — 1 occurrence (in `GET`)
5. `app/api/users/[userId]/meals/route.ts` — 2 occurrences
6. `app/api/users/[userId]/workouts/[workoutId]/route.ts` — 1 occurrence

---

## Final Recommendation

**NOT production ready. Do not merge.**

- **Quality Score: 3/10** — Bug-Fix Agent fixed non-broken files while leaving the actual critical bugs completely untouched
- **Blocking Issue:** All routes under `app/api/users/[userId]/` have broken authorization (CUID vs Clerk ID mismatch)
- **Impact:** No coach, student, or user can access their data via the nested API routes
- **Next Action:** Send back to Bug-Fix Agent with the exact files and patterns above

---

## Files Reviewed

- `app/api/activities/route.ts` ✅
- `app/api/meals/route.ts` ✅
- `app/api/workouts/[workoutId]/route.ts` ✅
- `app/api/users/[userId]/coach/route.ts` ❌
- `app/api/users/[userId]/dashboard/route.ts` ❌
- `app/api/users/[userId]/role/route.ts` ❌
- `app/api/users/[userId]/activities/route.ts` ❌
- `app/api/users/[userId]/meals/route.ts` ❌
- `app/api/users/[userId]/workouts/[workoutId]/route.ts` ❌
- `app/api/users/[userId]/students/route.ts` ✅ (was already correct)
- `prisma/schema.prisma` ✅ (clean, no issues)
- `lib/auth-utils.ts` ✅ (correctly returns full user object)
- `lib/session.ts` ✅ (correctly returns full user object)
