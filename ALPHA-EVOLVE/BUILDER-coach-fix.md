# Builder Summary: Coach Role Fix

**Date:** 2026-04-01  
**Branch:** feature/video-selector-for-exercises  
**Commit:** 864d6cf

## Fixes Applied

### Fix 1: Trainer Clients/Videos Role Filter
**Files:**
- `app/trainer/clients/page.tsx` line 52
- `app/trainer/videos/page.tsx` line 20

**Change:** Added "coach" to role filter arrays.

```typescript
// Before (clients page - JS array):
if (["owner", "trainer"].includes(org.userRole))

// After:
if (["owner", "trainer", "coach"].includes(org.userRole))

// Before (videos page - Prisma):
role: { in: ['owner', 'trainer'] }

// After:
role: { in: ['owner', 'trainer', 'coach'] }
```

### Fix 2A: Database Update
**User:** Coach Kevin (bmp19076@gmail.com)  
**ID:** cmnc6zhqe00006k3h9gg2pm2c  
**Change:** Set `User.role = "coach"`  
**Status:** ✅ Completed

### Fix 2B: Workout Edit Page Role Check
**File:** `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`

**Change:** Replaced hardcoded `User.role === "coach"` check with OrganizationMember-based check.

```typescript
// Before:
const dbUser = await db.user.findUnique({
  where: { id: user.id },
  select: { role: true }
})
if (dbUser?.role !== "coach") {
  redirect("/dashboard")
}

// After:
const dbUser = await db.user.findFirst({
  where: { clerkId: user.id },
  select: { id: true, role: true }
})
const coachMembership = dbUser ? await db.organizationMember.findFirst({
  where: { userId: dbUser.id, role: "coach" }
}) : null
if (!coachMembership && dbUser?.role !== "coach") {
  redirect("/dashboard")
}
```

## Verification
- TypeScript check: ✅ No errors on modified files
- Commit pushed to origin
- Vercel auto-deploy triggered

## Notes
- The Architect's line reference (73) for Fix 1 didn't match the actual file. Applied fix to both the clients page (JS array check) and videos page (Prisma query) which had the exact pattern described.
- Coach Kevin's User.role is now "coach" in the database.
