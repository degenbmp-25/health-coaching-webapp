# ALPHA-EVOLVE REVIEW v3 — multi-tenant-v1

## EXECUTIVE SUMMARY

**Quality Score: 4/10 — NOT Production Ready**

| Category | Status |
|----------|--------|
| clerkId comparison bugs | 🔴 CRITICAL — 7 routes affected |
| Missing relations (API→UI) | 🔴 CRITICAL — trainer clients page broken |
| Auth/authorization bugs | 🔴 CRITICAL — 3 routes can be bypassed |
| TypeScript errors | 🟢 None (clean compile) |
| Schema/API contract | 🟡 Minor issues |

**Recommendation: DO NOT DEPLOY until all CRITICAL issues are fixed.**

---

## COMPLETE BUG LIST

### CRITICAL (Blocks Deploy)

#### 1. `/api/users/[userId]/route.ts` — GET — Missing Relations for Trainer Client Flow

**File:** `app/api/users/[userId]/route.ts`
**Line:** ~55-70

**Bug:** When a trainer/owner fetches a client's data via `/api/users/[clientId]`, the response only includes `{ id, name, email, image }` with `programAssignments` included but `workoutSessions` missing.

**What UI expects** (`/trainer/clients/[id]/page.tsx`):
```typescript
interface ClientData {
  id: string
  name: string | null
  email: string
  image: string | null
  organizationRole: string | null       // ❌ MISSING
  primaryTrainerId: string | null        // ❌ MISSING
  programAssignments: Array<{...}>        // ✅ Included (but workoutSessions missing)
  workoutSessions: Array<{              // ❌ MISSING from response
    id: string
    workout: { name: string }
    status: string
    completedAt: string | null
    startedAt: string
  }>
}
```

**Fix needed:** Add `organizationRole`, `primaryTrainerId`, and `workoutSessions` to the response.

---

#### 2. `/api/users/[userId]/activities/route.ts` — GET/POST — clerkId Comparison Bug

**File:** `app/api/users/[userId]/activities/route.ts`

**Line 20 (GET):**
```typescript
if (user.clerkId === params.userId) {  // BUG
```
`user.clerkId` is a database UUID like `"cm3abc..."`. `params.userId` from coach sub-pages (dashboard context) is a **database UUID** passed via URL params. So this compares UUID to UUID correctly, BUT:
- `user.clerkId` is the WRONG field — should be `user.id` (the database UUID)

The correct check should be:
```typescript
if (user.id === params.userId) {  // FIXED — both are database UUIDs
```

**Line 44 (POST):**
```typescript
if (user.clerkId === params.userId) {  // BUG — wrong field
```

**Impact:** Coach cannot create activities for students because the wrong field is used for comparison.

---

#### 3. `/api/users/[userId]/coach/route.ts` — GET/PATCH — clerkId Comparison + Lookup Bugs

**File:** `app/api/users/[userId]/coach/route.ts`

**Line 20 (GET):**
```typescript
if (user.clerkId !== params.userId) {  // BUG
```
`user.clerkId` is database UUID. `params.userId` from coaching pages is database UUID. Both are UUIDs, so this compares UUID to UUID — BUT `user.clerkId` is the wrong field name. Should be `user.id`.

**Line 26 (GET):**
```typescript
where: { clerkId: params.userId }  // BUG
```
If `params.userId` is a database UUID (as coach sub-pages send), this lookup finds nothing (since `clerkId` field stores Clerk ID strings like `"user_2abc..."`).

**Same bugs on lines 66, 76 (PATCH):** Wrong field in comparison + wrong field in Prisma where clause.

**Fix:**
```typescript
const targetUser = await db.user.findUnique({
  where: { id: params.userId },  // FIXED — use database ID
})
if (user.id !== params.userId) {  // FIXED — compare database IDs
```

---

#### 4. `/api/users/[userId]/dashboard/route.ts` — GET — clerkId Comparison Bug

**File:** `app/api/users/[userId]/dashboard/route.ts`

**Line 37:**
```typescript
if (!student && user.clerkId !== params.userId) {  // BUG
```
- `user.clerkId` = database UUID
- `params.userId` = database UUID (from coach sub-pages URL)

Both are UUIDs so the comparison type is correct, but `user.clerkId` is the WRONG field — should be `user.id`.

This means when a student views their own dashboard:
- `student` is null (they're not a coach)
- `user.clerkId !== params.userId` compares the database UUID to itself
- Result: incorrectly grants/denies access based on wrong field

**Fix:** `user.id !== params.userId`

---

#### 5. `/api/users/[userId]/meals/route.ts` — GET/POST — clerkId Comparison Bug

**File:** `app/api/users/[userId]/meals/route.ts`

**Line 35 (GET):**
```typescript
if (currentUser.clerkId === params.userId) {  // BUG — wrong field
```
`currentUser.clerkId` is database UUID, should be `currentUser.id`.

**Line 63 (POST):**
```typescript
if (currentUser.clerkId !== params.userId) {  // BUG — wrong field
```
Same issue. `currentUser.clerkId` is database UUID, should be `currentUser.id` for proper comparison.

**Fix:** Use `currentUser.id === params.userId` and `currentUser.id !== params.userId`.

---

#### 6. `/api/users/[userId]/role/route.ts` — PATCH — Wrong clerkId Field

**File:** `app/api/users/[userId]/role/route.ts`

**Line 20:**
```typescript
if (user.clerkId !== params.userId) {  // BUG
```
`user.clerkId` is database UUID. `params.userId` from coaching page is database UUID. The comparison is UUID-to-UUID but uses wrong field.

**Line 26:**
```typescript
where: { clerkId: params.userId }  // BUG
```
If `params.userId` is a database UUID, this lookup fails (clerkId field stores Clerk ID strings).

**Fix:**
```typescript
const targetUser = await db.user.findUnique({
  where: { id: params.userId },  // FIXED
})
if (user.id !== params.userId) {  // FIXED
```

---

#### 7. `/api/users/[userId]/workouts/[workoutId]/route.ts` — GET — clerkId Comparison Bug

**File:** `app/api/users/[userId]/workouts/[workoutId]/route.ts`

**Line 31:**
```typescript
if (currentUser.clerkId === params.userId) {  // BUG — wrong field
```
`currentUser.clerkId` is database UUID, should be `currentUser.id`.

**Fix:** `currentUser.id === params.userId`

---

### HIGH (Should Fix Before Deploy)

#### 8. `/api/users/[userId]/route.ts` — PATCH — Authorization Comparison Bug

**File:** `app/api/users/[userId]/route.ts`
**Line:** ~113

```typescript
if (user.id !== params.userId) {
  return new NextResponse("Unauthorized", { status: 403 })
}
```
This correctly compares database IDs. However, if the frontend ever passes a Clerk ID as `params.userId`, this check would incorrectly pass, potentially allowing role updates.

**Risk:** Low (frontend seems consistent with database UUIDs for this route) but should be hardened.

---

#### 9. Missing `workoutSessions` in `/api/users/[userId]/route.ts`

When owner/trainer fetches member details, `workoutSessions` is not included in the response. The trainer clients page expects it for the "Recent Activity" card.

**Fix:** Add to the `include`:
```typescript
workoutSessions: {
  where: { userId: targetUser.id, status: "completed" },
  include: { workout: { select: { name: true } } },
  orderBy: { startedAt: "desc" },
  take: 5,
},
```

---

#### 10. Missing `organizationRole` and `primaryTrainerId` in `/api/users/[userId]/route.ts`

The trainer clients page needs `organizationRole` and `primaryTrainerId` to display the client's role and whether the current trainer is their primary trainer.

**Fix:** Include `organizationRole` and `primaryTrainerId` in the user select.

---

### MEDIUM (Nice to Fix)

#### 11. Inconsistent ID Types Across Routes

Different routes accept different ID types for `params.userId`:

| Route | Accepts | Source |
|-------|---------|--------|
| `/api/users/[userId]/route.ts` | Database UUID | Trainer client pages |
| `/api/users/[userId]/students` | Clerk ID | Coaching page (`useUser().id`) |
| `/api/users/[userId]/activities` | Database UUID | Coach sub-pages |
| `/api/users/[userId]/coach` | Database UUID | Coach sub-pages |
| `/api/users/[userId]/dashboard` | Database UUID | Coach sub-pages |
| `/api/users/[userId]/meals` | Database UUID | Coach sub-pages |
| `/api/users/[userId]/role` | Clerk ID (?) | Coaching page |

This is confusing and error-prone. Should standardize on one ID type (preferably database UUID) and update frontend to consistently pass database UUIDs.

#### 12. Exercise Schema Duplicate `name` Field

**File:** `prisma/schema.prisma`

```prisma
model Exercise {
  id          String   @id @default(cuid())
  name        String
  name        String    // DUPLICATE!
  description String?
```

**Fix:** Remove the duplicate `name` line.

---

## SYSTEMATIC clerkId BUG ANALYSIS

### Pattern: Wrong field used for self/owner comparison

The `requireAuth()` function returns a User object where:
- `user.id` = database UUID (e.g., `"cm3abc123..."`)
- `user.clerkId` = Clerk ID string (e.g., `"user_2abc..."`)

The BUGGY pattern in 6 routes:
```typescript
if (user.clerkId === params.userId) {  // WRONG
// user.clerkId is a database UUID in the DB, but...
// params.userId is also a database UUID (passed from coach sub-pages)
// So we're comparing UUID to UUID, but using the WRONG field name
```

The CORRECT pattern:
```typescript
if (user.id === params.userId) {  // CORRECT
// Both are database UUIDs, comparing the right field
```

### Files with clerkId Bugs (confirmed):

| File | Method | Bug |
|------|--------|-----|
| `activities/route.ts` | GET, POST | `user.clerkId` should be `user.id` |
| `coach/route.ts` | GET, PATCH | `user.clerkId` should be `user.id`; `clerkId:` in where should be `id:` |
| `dashboard/route.ts` | GET | `user.clerkId` should be `user.id` |
| `meals/route.ts` | GET, POST | `currentUser.clerkId` should be `currentUser.id` |
| `role/route.ts` | PATCH | `clerkId:` in where should be `id:` |
| `workouts/[workoutId]/route.ts` | GET | `currentUser.clerkId` should be `currentUser.id` |

### Files CORRECTLY fixed:

| File | Method | Status |
|------|--------|--------|
| `goals/route.ts` | GET | ✅ FIXED — uses `user.id` |
| `workouts/route.ts` | GET | ✅ FIXED — uses `targetUser.id` from clerk lookup |

---

## AUTH CHECKS AUDIT

### Routes with Proper Auth:

| Route | Auth Method |
|-------|-------------|
| Most routes | `requireAuth()` — ✅ Correct |
| notification-settings | `auth()` directly — ✅ Correct |
| organization routes | `getCurrentUser()` + membership check — ✅ Correct |

### Routes with Auth Issues:

1. **coach/route.ts PATCH**: The check `user.clerkId !== params.userId` uses wrong field (though both are UUIDs so the logic "works" type-wise).

2. **activities/route.ts POST**: After fixing the clerkId bug, the coach check `user.role === "coach"` is correct.

3. **All broken routes**: The pattern of looking up user by Clerk ID first, then using database ID for auth comparison, is the RIGHT pattern — but they use `clerkId` field in the wrong places.

---

## TYPE SCRIPT AUDIT

✅ **No TypeScript errors** — `npx tsc --noEmit` passes cleanly.

---

## API-UI CONTRACT AUDIT

### `/trainer/clients/[id]/page.tsx`

Calls: `GET /api/users/${id}`

**Expects:**
- `id`, `name`, `email`, `image` ✅
- `organizationRole` ❌ MISSING
- `primaryTrainerId` ❌ MISSING
- `programAssignments` ✅ (included in one code path)
- `workoutSessions` ❌ MISSING

**Also calls:** `POST /api/program-assignments` — ✅ Looks fine

### `/admin/organizations/[id]/page.tsx`

Calls: `GET /api/organizations/${id}`

**Expects:**
- `id`, `name`, `type` ✅
- `userRole` ✅
- `members` with nested `user` ✅
- `programs` with `_count` ✅
- `sheetConnections` with nested `trainer` ✅

**API response matches UI needs:** ✅ CORRECT

### `/client/programs/page.tsx`

Calls: `GET /api/program-assignments/client/${currentUser.id}`

**Expects:**
- `id`, `startedAt` ✅
- `program.name`, `program.description`, `program.organization.name` ✅
- `program.workoutCount`, `program.completedWorkoutCount` ✅

**API response matches UI needs:** ✅ CORRECT

### `/dashboard/coaching/page.tsx`

Calls: `GET /api/users/${user.id}/students`

**Issue:** `user.id` from `useUser()` is Clerk ID. Route expects Clerk ID. This works BUT creates inconsistency with coach sub-pages that pass database UUIDs.

### Coach Sub-pages (`/dashboard/coaching/students/[studentId]/...`)

All use `params.studentId` (database UUID from URL). The routes they call (`activities`, `coach`, `dashboard`, `meals`, `workouts`, `goals`) mostly have clerkId bugs.

---

## PRISMA SCHEMA AUDIT

### Issue 1: Duplicate `name` field in Exercise model
```prisma
name String
name String  # DUPLICATE!
```
**Fix:** Remove one line.

### Issue 2: OrganizationMember missing unique constraint comment
The schema has `@@unique([organizationId, userId])` which is correct.

### All other models appear consistent with API usage.

---

## RECOMMENDATION

### DO NOT DEPLOY in current state.

**Priority 1 — Fix these 7 clerkId comparison bugs:**
1. `activities/route.ts` — lines 20, 44
2. `coach/route.ts` — lines 20, 26, 66, 76
3. `dashboard/route.ts` — line 37
4. `meals/route.ts` — lines 35, 63
5. `role/route.ts` — lines 20, 26
6. `workouts/[workoutId]/route.ts` — line 31
7. `/api/users/[userId]/route.ts` — missing relations for trainer flow

**Priority 2 — Fix the Exercise schema duplicate.**

**Priority 3 — Consider standardizing on database UUIDs across all routes for consistency.**

### Estimated Fix Count:
- **7 CRITICAL bugs** (all clerkId comparison bugs + missing relations)
- **4 HIGH bugs** (authorization hardening + additional missing fields)
- **2 MEDIUM bugs** (inconsistency + schema duplicate)

**Total: 13 issues, 7 critical blocking deploy.**

---

*Review compiled: 2026-03-28*
*Reviewer: Alpha-Evolve Reviewer Agent*
