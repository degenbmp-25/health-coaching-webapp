# Alpha-Evolve SPEC.md - Habithletics Workout Query Fix

**Project:** habithletics-redesign-evolve  
**Date:** 2026-03-30  
**Architect:** Architect Agent  
**Status:** READY FOR BUILDER

---

## Problem Summary

`getUserWorkouts()` queries `WHERE userId = userId`, but the multi-tenant schema stores workouts on **Programs**, not directly on users. Workouts are accessible through:
- **Client** → `ProgramAssignment` → `Program` → `Workout`
- **Trainer/Owner** → `OrganizationMember` → `Organization` → `Program` → `Workout`

---

## Data Model Relationships

```
Organization (1) ──── (many) Program
    │                       │
    │                       │
OrganizationMember    Workout (via programId)
    │                       │
    │                       │
    └── User ─── ProgramAssignment ── Program
```

**Key fields:**
- `Workout.programId` → links workout to a Program (nullable, legacy workouts may have null)
- `ProgramAssignment.clientId` → links a client User to a Program
- `OrganizationMember.userId` + `role` ("owner"|"trainer"|"client") → user's role in an org

---

## Fix #1: `lib/api/workouts.ts` — Replace `getUserWorkouts()`

**Replace the entire `getUserWorkouts()` function** with a multi-tenant-aware version that determines the user's role and queries accordingly.

### New Implementation

```typescript
export async function getUserWorkouts(userId: string) {
  // Step 1: Find the user's organization membership(s)
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });

  // Step 2: If no org membership, fall back to legacy userId query (backward compat)
  if (memberships.length === 0) {
    return await db.workout.findMany({
      where: { userId },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Step 3: Check if user is a client (client role in any org)
  const isClient = memberships.some((m) => m.role === "client");
  const isTrainerOrOwner = memberships.some((m) =>
    ["owner", "trainer"].includes(m.role)
  );

  // STEP 4A: CLIENT — get workouts from assigned programs
  if (isClient && !isTrainerOrOwner) {
    const programIds = await db.programAssignment.findMany({
      where: { clientId: userId },
      select: { programId: true },
    });

    return await db.workout.findMany({
      where: {
        programId: { in: programIds.map((p) => p.programId) },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // STEP 4B: TRAINER/OWNER — get workouts from all programs in their org(s)
  const orgIds = memberships.map((m) => m.organizationId);

  const programIds = await db.program.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });

  return await db.workout.findMany({
    where: {
      programId: { in: programIds.map((p) => p.id) },
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
```

---

## Fix #2: `lib/api/workouts.ts` — Add `getUserWorkoutsByRole()`

Add a new helper function for explicit role-based queries (useful for dashboard tabs):

```typescript
/**
 * Get workouts for a client user (via ProgramAssignments)
 */
export async function getClientWorkouts(clientId: string) {
  const programIds = await db.programAssignment.findMany({
    where: { clientId },
    select: { programId: true },
  });

  return await db.workout.findMany({
    where: {
      programId: { in: programIds.map((p) => p.programId) },
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Get workouts for a trainer/owner (via their organization's programs)
 */
export async function getTrainerWorkouts(trainerId: string) {
  // Get all orgs where user is owner or trainer
  const memberships = await db.organizationMember.findMany({
    where: {
      userId: trainerId,
      role: { in: ["owner", "trainer"] },
    },
    select: { organizationId: true },
  });

  if (memberships.length === 0) {
    return [];
  }

  const orgIds = memberships.map((m) => m.organizationId);

  const programIds = await db.program.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });

  return await db.workout.findMany({
    where: {
      programId: { in: programIds.map((p) => p.id) },
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
```

---

## Fix #3: `app/api/users/[userId]/workouts/route.ts` — Fix API Authorization

The GET handler's authorization logic has a bug: it checks `organizationId: params.userId`, but `organizationId` is a UUID, not a userId. The intent is to allow trainers/owners of the target user's organization to access that user's workouts.

**Current (BROKEN) authorization check:**
```typescript
const membership = await db.organizationMember.findFirst({
  where: {
    userId: currentUser.id,
    role: { in: ["owner", "trainer"] },
    organizationId: params.userId, // ← WRONG: params.userId is a userId, not orgId
  },
})
```

**Corrected approach:** A trainer/owner should be able to access workouts for users in their organization. We need to first find the target user's organization membership, then check if the current user is a trainer/owner in the same organization.

**Replace the authorization block in GET handler with:**
```typescript
// Authorization: own data, or org trainer/owner for target user
if (currentUser.id !== params.userId) {
  // Get target user's organization membership
  const targetMembership = await db.organizationMember.findFirst({
    where: { userId: params.userId },
    select: { organizationId: true },
  });

  if (!targetMembership) {
    return new NextResponse("Unauthorized: User not in organization", { status: 403 });
  }

  // Check if current user is trainer/owner in the same org
  const membership = await db.organizationMember.findFirst({
    where: {
      userId: currentUser.id,
      role: { in: ["owner", "trainer"] },
      organizationId: targetMembership.organizationId,
    },
  });

  if (!membership) {
    return new NextResponse("Unauthorized: Not authorized", { status: 403 });
  }
}
```

**Also update the workout query in the GET handler** to use the multi-tenant model instead of `userId`:

```typescript
// After authorization passes, fetch workouts based on multi-tenant model
// Get target user's org membership
const targetMembership = await db.organizationMember.findFirst({
  where: { userId: params.userId },
  select: { organizationId: true },
});

let workouts;
if (targetMembership) {
  // User is in an org — query via program assignments
  const programAssignments = await db.programAssignment.findMany({
    where: { clientId: params.userId },
    select: { programId: true },
  });

  workouts = await db.workout.findMany({
    where: {
      programId: { in: programAssignments.map((pa) => pa.programId) },
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
} else {
  // Fallback to legacy userId query
  workouts = await db.workout.findMany({
    where: { userId: params.userId },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
```

**Apply the same fix to the POST handler's authorization block.**

---

## Fix #4: `app/dashboard/workouts/page.tsx` — No Changes Needed

The page already calls `getUserWorkouts(user.id)`. Once `getUserWorkouts()` is fixed in `lib/api/workouts.ts`, this page will automatically return correct results.

If you want to add trainer/client tab differentiation later, you could import and use `getClientWorkouts()` vs `getTrainerWorkouts()` — but for the P0 fix, just fixing `getUserWorkouts()` is sufficient.

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `lib/api/workouts.ts` | **Replace** `getUserWorkouts()` | Multi-tenant-aware query via ProgramAssignment/Organization |
| `lib/api/workouts.ts` | **Add** `getClientWorkouts()` | Explicit client-only workout query |
| `lib/api/workouts.ts` | **Add** `getTrainerWorkouts()` | Explicit trainer/owner workout query |
| `app/api/users/[userId]/workouts/route.ts` | **Fix** authorization | Correct org-based auth (not userId as orgId) |
| `app/api/users/[userId]/workouts/route.ts` | **Fix** GET query | Use program assignment lookup instead of userId |
| `app/api/users/[userId]/workouts/route.ts` | **Fix** POST authorization | Same org-based auth fix as GET |
| `app/dashboard/workouts/page.tsx` | **No change** | Works automatically after lib/api/workouts.ts fix |

---

## Role Determination Logic

| User Role | Query Path | Prisma Query |
|-----------|------------|--------------|
| No `OrganizationMember` | Legacy fallback | `WHERE userId = userId` |
| `client` only | `ProgramAssignment` → `Program` → `Workout` | `WHERE programId IN (SELECT programId FROM program_assignments WHERE clientId = userId)` |
| `owner` or `trainer` | `Organization` → `Program` → `Workout` | `WHERE programId IN (SELECT id FROM programs WHERE organizationId IN (... user's orgs))` |

---

## Backward Compatibility

- **Legacy workouts** (those with `userId` set but `programId = null`) are preserved by the fallback query when no org membership exists.
- **Existing `getStudentWorkouts()` and `getWorkout()` functions** are unchanged — they serve the coach-student relationship and should continue working.
- The `userId` field on `Workout` model is kept (for potential future use); the fix uses `programId` as the primary join key.

---

## Success Criteria

- [ ] `getUserWorkouts()` returns workouts from assigned programs for clients
- [ ] `getUserWorkouts()` returns workouts from org programs for trainers/owners
- [ ] API route `/api/users/[userId]/workouts` returns correct workouts
- [ ] Dashboard `/dashboard/workouts` page loads without errors
- [ ] All 5 workouts + 42 exercises remain visible
- [ ] Build passes without TypeScript errors
