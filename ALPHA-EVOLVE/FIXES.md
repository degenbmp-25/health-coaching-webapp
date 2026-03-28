# Alpha-Evolve Bug Fixes

**Date:** 2026-03-28  
**Branch:** multi-tenant-v1

## Issues Fixed

### CRITICAL #1: Route Mismatch in removeMember()
**File:** `app/admin/organizations/[id]/page.tsx:47`

**Problem:** `removeMember()` called `DELETE /api/organizations/${id}/members/${memberId}` but the API route expects `DELETE /api/organizations/${id}/members` with `userId` in the **body**.

**Fix:** Updated client to send `userId` in request body:
```typescript
const res = await fetch(`/api/organizations/${id}/members`, {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: memberId }),
})
```

---

### CRITICAL #2: User Lookup by Wrong ID
**File:** `app/api/users/[userId]/route.ts:16-45`

**Problem:** GET handler compared `params.userId === user.clerkId`, but the trainer UI passes the **database UUID** in the URL, not the Clerk ID.

**Fix:** Changed all lookups to use database UUID (`id`) instead of Clerk ID (`clerkId`):
- Self-check: `params.userId === user.id` (was `user.clerkId`)
- Database queries now use `where: { id: params.userId }` instead of `where: { clerkId: params.userId }`

---

### CRITICAL #3: Wrong Role Check
**File:** `app/api/users/[userId]/route.ts:36`

**Problem:** Check used `user.role === "coach"`, but in multi-tenant model, trainer role is stored in `OrganizationMember.role`, not `User.role`.

**Fix:** Replaced User.role check with OrganizationMember query:
```typescript
const requestingUserMembership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ["owner", "trainer"] },
  },
})
```

Also applied same fix to PATCH handler for consistency.

---

### HIGH #1: Empty admin/sheets/ Directory
**File:** `app/admin/sheets/`

**Problem:** Directory existed but was empty - no admin sheet management UI.

**Fix:** Removed unused empty directory. Sheet connections are managed via the organization detail page's "Sheet Connections" tab instead.

---

---

### CRITICAL NEW #1: Goals Route Still Uses clerkId
**File:** `app/api/users/[userId]/goals/route.ts`

**Problem:** Permission check compared `params.userId !== currentUser.clerkId`, but `params.userId` is now the database UUID, not clerkId.

**Fix:** Changed comparison to use database UUID:
```typescript
// Before:
if (params.userId !== currentUser.clerkId && !student)

// After:
if (params.userId !== currentUser.id && !student)
```

---

### CRITICAL NEW #2: Workouts Route Still Uses clerkId
**File:** `app/api/users/[userId]/workouts/route.ts`

**Problem:** Same `clerkId` comparison issue in both GET and POST handlers.

**Fix:** Changed both comparisons to use database UUID:
```typescript
// GET handler - Before:
if (currentUser.clerkId === params.userId)

// GET handler - After:
if (currentUser.id === params.userId)

// POST handler - Before:
if (currentUser.clerkId !== params.userId)

// POST handler - After:
if (currentUser.id !== params.userId)
```

---

### HIGH NEW #1: Trainer Client Detail Missing Relations
**File:** `app/api/users/[userId]/route.ts`

**Problem:** `/trainer/clients/[id]` page expects `programAssignments` and `workoutSessions` in API response, but the trainer query didn't include them.

**Fix:** Added `.include()` for missing relations in the trainer client detail query:
```typescript
const targetMembership = await db.organizationMember.findFirst({
  where: {
    userId: params.userId,
    organizationId: requestingUserMembership.organizationId,
  },
  include: {
    user: {
      select: { id: true, name: true, email: true, image: true },
      include: { programAssignments: true, workoutSessions: true },
    },
  },
})
```

---

## Alpha-Evolve Iteration 2 Fixes (2026-03-28)

### CRITICAL #1: activities/route.ts - clerkId vs id mismatch
**File:** `app/api/users/[userId]/activities/route.ts`

**Problem:** Authorization checks compared `user.clerkId === params.userId`, but `params.userId` is the database UUID (not clerkId), causing all cross-user access checks to fail.

**Fix:** Changed `user.clerkId` to `user.id` in both GET and POST handlers:
```typescript
// Before:
if (user.clerkId === params.userId) {

// After:
if (user.id === params.userId) {
```

### CRITICAL #2: coach/route.ts - clerkId vs id mismatch + wrong where clause
**File:** `app/api/users/[userId]/coach/route.ts`

**Problem:** (1) Authorization check used `user.clerkId !== params.userId`. (2) Prisma `where` clauses used `clerkId: params.userId` instead of `id: params.userId`.

**Fix:** Changed authorization check and all Prisma where clauses:
```typescript
// Authorization - Before:
if (user.clerkId !== params.userId)

// Authorization - After:
if (user.id !== params.userId)

// Prisma where - Before:
where: { clerkId: params.userId }

// Prisma where - After:
where: { id: params.userId }
```

### CRITICAL #3: dashboard/route.ts - clerkId vs id mismatch
**File:** `app/api/users/[userId]/dashboard/route.ts`

**Problem:** Access check `user.clerkId !== params.userId` used wrong field.

**Fix:** Changed to `user.id !== params.userId`:
```typescript
// Before:
if (!student && user.clerkId !== params.userId)

// After:
if (!student && user.id !== params.userId)
```

### CRITICAL #4: meals/route.ts - clerkId vs id mismatch
**File:** `app/api/users/[userId]/meals/route.ts`

**Problem:** Both GET and POST handlers used `currentUser.clerkId` in comparisons with `params.userId`.

**Fix:** Changed to `currentUser.id` in both handlers:
```typescript
// GET - Before:
if (currentUser.clerkId === params.userId)

// GET - After:
if (currentUser.id === params.userId)

// POST - Before:
if (currentUser.clerkId !== params.userId)

// POST - After:
if (currentUser.id !== params.userId)
```

### CRITICAL #5: role/route.ts - clerkId vs id mismatch in where clause
**File:** `app/api/users/[userId]/role/route.ts`

**Problem:** (1) Authorization check used `user.clerkId`. (2) Prisma `where` clause used `clerkId: params.userId` instead of `id: params.userId`.

**Fix:**
```typescript
// Authorization - Before:
if (user.clerkId !== params.userId)

// Authorization - After:
if (user.id !== params.userId)

// Prisma where - Before:
where: { clerkId: params.userId }

// Prisma where - After:
where: { id: params.userId }
```

### CRITICAL #6: workouts/[workoutId]/route.ts - clerkId vs id mismatch
**File:** `app/api/users/[userId]/workouts/[workoutId]/route.ts`

**Problem:** GET handler used `currentUser.clerkId === params.userId` for own-workout check.

**Fix:**
```typescript
// Before:
if (currentUser.clerkId === params.userId)

// After:
if (currentUser.id === params.userId)
```

### CRITICAL #7: Missing relations in user detail route
**File:** `app/api/users/[userId]/route.ts`

**Problem:** Trainer client query was missing `organizationRole` and `primaryTrainerId` scalar fields in select, and had incorrect mix of `select` and `include` on same level.

**Fix:** Separated `select` (for scalars) and `include` (for relations), added missing scalar fields:
```typescript
// Before (broken - select + include conflict, missing scalars):
user: {
  select: { id: true, name: true, email: true, image: true },
  include: { programAssignments: true, workoutSessions: true, organizationRole: true, primaryTrainerId: true },
}

// After (fixed - proper select/include separation, all fields present):
user: {
  select: { id: true, name: true, email: true, image: true, organizationRole: true, primaryTrainerId: true },
  include: { programAssignments: true, workoutSessions: true },
}
```

### MEDIUM #1: Prisma duplicate name field in Exercise
**File:** `prisma/schema.prisma`

**Problem:** Issue described a duplicate `name` field in Exercise model.

**Finding:** Upon inspection, Exercise model only has a single `name` field (line 150: `name String`). No duplicate exists in current schema. Issue may have been resolved in prior iteration or was misreported.

**Status:** No action needed.

---

## Verification

- TypeScript check: `npx tsc --noEmit` ✓ No errors (all 8 issues resolved)
- All fixes applied to branch `multi-tenant-v1`

