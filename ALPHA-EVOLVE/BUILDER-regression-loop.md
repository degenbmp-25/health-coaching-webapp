# BUILDER Regression Loop Report

## Date: 2026-04-01

## Issue: Quick-fix broke the app (video selector not showing for Coach Kevin)

### Root Cause Analysis

**The "fix" in commit 745006c was WRONG. The original code was CORRECT.**

#### What `getCurrentUser()` Returns

```typescript
// lib/session.ts
export async function getCurrentUser() {
  const { userId } = await auth()  // Clerk ID: "user_30i7HVsu07CLHiXWSnDQv1BmVKz"
  
  let user = await db.user.findUnique({
    where: { clerkId: userId },  // Looks up by Clerk ID
  })
  
  return user  // Returns user object with user.id = DB CUID (e.g., "cmnc6zhqe00006k3h9gg2pm2c")
}
```

**Key insight:** `getCurrentUser()` returns the full user object where `user.id` is the **DB CUID**, NOT the Clerk ID.

#### The Broken Code (745006c)

```typescript
// WRONG - user.id IS the DB CUID, not Clerk ID!
const dbUser = await db.user.findFirst({
  where: { clerkId: user.id },  // Looking for clerkId = "cmnc6zhq..." (DB CUID)
  select: { id: true, role: true }
})

const membership = dbUser ? await db.organizationMember.findFirst({
  where: {
    userId: dbUser.id,  // This would be null because dbUser is null!
    ...
  },
}) : null
```

The broken code tried to look up the user by Clerk ID using `user.id` (which is the DB CUID). This failed because:
- `clerkId` values are like `"user_30i7HVsu07CLHiXWSnDQv1BmVKz"`
- `user.id` is like `"cmnc6zhqe00006k3h9gg2pm2c"`
- So `db.user.findFirst({ where: { clerkId: user.id } })` found NO user
- Therefore `dbUser` was null, `membership` was null, and `isTrainer` was false
- **Result:** Video selector was hidden

#### The Original Code (02a41e6) - CORRECT

```typescript
// CORRECT - user.id IS the DB CUID, this directly finds the membership
const membership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,  // user.id = "cmnc6zhqe00006k3h9gg2pm2c" - correct!
    role: { in: ['owner', 'trainer', 'coach'] }
  },
  include: { organization: true }
})
```

### What Was Reverted

Files reverted to state before commit 745006c:
1. `app/dashboard/layout.tsx`
2. `app/trainer/layout.tsx`
3. `app/dashboard/workouts/[workoutId]/edit/page.tsx`
4. `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`

### Database State (Verified)

Coach Kevin (bmp19076):
- User.id: `cmnc6zhqe00006k3h9gg2pm2c`
- User.role: `"user"` (NOT "coach")
- OrganizationMembership.role: `"coach"` (in Habithletics Gym)
- Organization has 10+ videos with status `'ready'`

### Deployment

- Revert committed: `77d82d9`
- Deployed to: https://habithletics-redesign-evolve-coral.vercel.app

### Lesson Learned

**Never apply ad-hoc fixes without understanding the codebase first.**

The Architect confirmed that `getCurrentUser()` returns `user.id` as the DB CUID. The broken commit 745006c incorrectly assumed `user.id` was the Clerk ID and tried to resolve it again, breaking the membership lookup.

**The systematic approach (understand BEFORE fixing) would have caught this immediately.**

### Verification Needed

Coach Kevin (bmp19076@gmail.com) should now be able to see the video selector when editing workouts at:
- `/dashboard/workouts/[workoutId]/edit`

The video selector should appear below the "Notes" field for each exercise when:
1. User is logged in as a coach/trainer/owner
2. User has an organization membership with coach/trainer/owner role
3. The organization has videos with status 'ready'
