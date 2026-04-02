# SPEC.md - Habit Tracking Authorization Fix

## Problem Statement

The habit tracking routes (`/api/users/[userId]/activities`, `/api/users/[userId]/meals`, `/api/users/[userId]/workouts`) have inconsistent authorization logic:

- **Meals route**: Correctly checks `coachId` relationship AND organization membership
- **Activities route**: Only checks organization membership (missing `coachId` check)
- **Workouts route**: Only checks organization membership via `authorizeWorkoutAccess` helper (missing `coachId` check)

This causes coaches to get 403 Forbidden when viewing their students' activities and workouts if they're not in the same organization.

## Solution

Standardize authorization in all three routes to follow this priority:

1. **Own data**: If `currentUser.id === targetDbUserId` → ALLOW
2. **Coach-student**: If `db.user.findFirst({ where: { id: targetDbUserId, coachId: currentUser.id } })` → ALLOW
3. **Organization membership**: If `currentUser` has role `owner|trainer|coach` in same org as `targetUser` → ALLOW
4. **Otherwise**: DENY (403)

## Changes Required

### 1. Activities Route - Add coachId Check

**File:** `app/api/users/[userId]/activities/route.ts`

**Current code:**
```typescript
// Authorization: own data or org trainer/owner
if (user.id !== targetDbUserId) {
  const membership = await db.organizationMember.findFirst({
    where: {
      userId: user.id,
      role: { in: ["owner", "trainer", "coach"] },
    },
  })
  if (!membership) {
    return new NextResponse("Forbidden", { status: 403 })
  }
}
```

**Fixed code:**
```typescript
// Authorization: own data, coach-student relationship, or org trainer/owner
if (user.id !== targetDbUserId) {
  // Check coach-student relationship first
  const student = await db.user.findFirst({
    where: {
      id: targetDbUserId,
      coachId: user.id,
    },
  })
  
  if (!student) {
    // Fall back to organization membership check
    const membership = await db.organizationMember.findFirst({
      where: {
        userId: user.id,
        role: { in: ["owner", "trainer", "coach"] },
      },
    })
    if (!membership) {
      return new NextResponse("Forbidden", { status: 403 })
    }
  }
}
```

### 2. Workouts Route - Add coachId Check to authorizeWorkoutAccess

**File:** `app/api/users/[userId]/workouts/route.ts`

**Current `authorizeWorkoutAccess` function:**
```typescript
async function authorizeWorkoutAccess(
  currentUserId: string,
  targetDbUserId: string
): Promise<{ authorized: boolean; targetMembership: { organizationId: string } | null }> {
  if (currentUserId === targetDbUserId) {
    const targetMembership = await db.organizationMember.findFirst({
      where: { userId: targetDbUserId },
      select: { organizationId: true },
    });
    return { authorized: true, targetMembership };
  }

  const targetMembership = await db.organizationMember.findFirst({
    where: { userId: targetDbUserId },
    select: { organizationId: true },
  });

  if (!targetMembership) {
    return { authorized: false, targetMembership: null };
  }

  const membership = await db.organizationMember.findFirst({
    where: {
      userId: currentUserId,
      role: { in: [ROLE.OWNER, ROLE.TRAINER, ROLE.COACH] },
      organizationId: targetMembership.organizationId,
    },
  });

  if (!membership) {
    return { authorized: false, targetMembership };
  }

  return { authorized: true, targetMembership };
}
```

**Fixed `authorizeWorkoutAccess` function:**
```typescript
async function authorizeWorkoutAccess(
  currentUserId: string,
  targetDbUserId: string
): Promise<{ authorized: boolean; targetMembership: { organizationId: string } | null }> {
  // If accessing own data
  if (currentUserId === targetDbUserId) {
    const targetMembership = await db.organizationMember.findFirst({
      where: { userId: targetDbUserId },
      select: { organizationId: true },
    });
    return { authorized: true, targetMembership };
  }

  // Check coach-student relationship
  const student = await db.user.findFirst({
    where: {
      id: targetDbUserId,
      coachId: currentUserId,
    },
  });
  
  if (student) {
    // Coach accessing student - return org membership if exists
    const targetMembership = await db.organizationMember.findFirst({
      where: { userId: targetDbUserId },
      select: { organizationId: true },
    });
    return { authorized: true, targetMembership };
  }

  // Fall back to organization membership check
  const targetMembership = await db.organizationMember.findFirst({
    where: { userId: targetDbUserId },
    select: { organizationId: true },
  });

  if (!targetMembership) {
    return { authorized: false, targetMembership: null };
  }

  const membership = await db.organizationMember.findFirst({
    where: {
      userId: currentUserId,
      role: { in: [ROLE.OWNER, ROLE.TRAINER, ROLE.COACH] },
      organizationId: targetMembership.organizationId,
    },
  });

  if (!membership) {
    return { authorized: false, targetMembership };
  }

  return { authorized: true, targetMembership };
}
```

## Files to Modify

| File | Change |
|------|--------|
| `app/api/users/[userId]/activities/route.ts` | Add coachId check in GET and POST handlers |
| `app/api/users/[userId]/workouts/route.ts` | Add coachId check to `authorizeWorkoutAccess` helper |

## Success Criteria

1. ✅ Activities route allows coach to access student's activities via `coachId`
2. ✅ Workouts route allows coach to access student's workouts via `coachId`
3. ✅ Meals route continues to work (already has correct logic)
4. ✅ Own data access continues to work for all routes
5. ✅ Organization membership continues to work as fallback
6. ✅ Build passes with no new errors

## Quality Gates

- [ ] Build passes
- [ ] TypeScript compiles
- [ ] No new ESLint errors
- [ ] Manual verification with test accounts
