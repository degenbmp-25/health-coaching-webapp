# Review Report - Habit Tracking Authorization Fix

## Summary

Fixed inconsistent authorization logic in habit tracking routes that caused coaches to get 403 Forbidden when viewing their students' activities and workouts.

## Root Cause

The three habit tracking routes had inconsistent authorization checks:

| Route | Own Data | coachId Check | Org Membership |
|-------|----------|---------------|----------------|
| Activities | ✅ | ❌ Missing | ✅ |
| Meals | ✅ | ✅ | ✅ |
| Workouts | ✅ | ❌ Missing | ✅ |

When a coach (thehivemindintelligence@gmail.com) tried to access their student's (kvnmiller11@gmail.com) activities or workouts, they would get 403 because:
1. The routes checked organization membership
2. But coach-student relationship is via `coachId`, not org membership
3. If coach and student weren't in the same organization, access was denied

## Changes Made

### 1. Activities Route (`app/api/users/[userId]/activities/route.ts`)

Added coachId check to both GET and POST handlers:

```typescript
// Before: Only checked org membership
if (user.id !== targetDbUserId) {
  const membership = await db.organizationMember.findFirst({...})
  if (!membership) return 403
}

// After: Check coachId first, then org membership as fallback
if (user.id !== targetDbUserId) {
  const student = await db.user.findFirst({
    where: { id: targetDbUserId, coachId: user.id }
  })
  
  if (!student) {
    // Fall back to org membership check
    const membership = await db.organizationMember.findFirst({...})
    if (!membership) return 403
  }
}
```

### 2. Workouts Route (`app/api/users/[userId]/workouts/route.ts`)

Updated `authorizeWorkoutAccess` helper function to check coachId relationship:

```typescript
// Before: Only checked org membership
// After: Check coachId first
const student = await db.user.findFirst({
  where: { id: targetDbUserId, coachId: currentUserId }
})
if (student) return { authorized: true, targetMembership }
```

### 3. Meals Route - No Changes Needed

The meals route already had the correct coachId check implementation.

## Files Modified

| File | Changes |
|------|---------|
| `app/api/users/[userId]/activities/route.ts` | Added coachId check to GET and POST |
| `app/api/users/[userId]/workouts/route.ts` | Added coachId check to `authorizeWorkoutAccess` |

## Quality Gates: PASSED

- [x] Build passes
- [x] TypeScript compiles
- [x] No new ESLint errors
- [x] Changes are minimal and targeted

## Deployment

- **Production URL:** https://habithletics-redesign-evolve-coral.vercel.app
- **Commit:** e4b34b2
- **Branch:** feature/video-selector-for-exercises

## Verification Checklist

- [ ] Client (kvnmiller11@gmail.com) can view their activities
- [ ] Client can view their meals
- [ ] Client can view their workouts
- [ ] Client can log new activities
- [ ] Client can log new meals
- [ ] Coach (thehivemindintelligence@gmail.com) can view their clients' activities
- [ ] Coach can view their clients' meals
- [ ] Coach can view their clients' workouts
- [ ] Coach can create activities for clients
- [ ] All routes return correct data (not 403/404)

## Remaining Issues

None related to this fix. Pre-existing warnings:
- ESLint img element warnings (3 files)
- React Hook dependency warning (todays-activities.tsx)
