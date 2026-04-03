# Evolution Log - Clerk ID Standardization

## Loop 1: Initial Fix (COMPLETED)

### Changes Made

1. **lib/api/id-utils.ts**
   - Updated `resolveClerkIdToDbUserId()` to handle BOTH Clerk IDs (user_xxx) and CUIDs (clndxxx)
   - If input starts with 'clnd' → verifies user exists by CUID directly
   - If input starts with 'user_' → resolves via clerkId field
   - Added fallback for unknown formats

2. **app/dashboard/coaching/page.tsx**
   - Removed unnecessary `currentUserDbId` state and `/api/users/me` call
   - Changed `fetchStudents` to use Clerk ID (`user.id`) instead of CUID
   - Updated `ClientSelector` and `StudentDataDashboard` props to use Clerk ID
   - Fixed TypeScript issues with `userId` potentially being undefined

3. **components/coach/ClientSelector.tsx**
   - Added `useUser` import from `@clerk/nextjs`
   - Removed `/api/users/me` call and `currentUserDbId` state
   - `addAsClient` now uses `user?.id` (Clerk ID) for API calls
   - Fixed TypeScript null check for `user?.id`

## Verification - April 2, 2026

### Authorization Flow (Verified Correct)

**Coach Adds Client:**
```
ClientSelector.addAsClient(userId)
  → POST /api/users/${coachClerkId}/students
    → requireAuth() returns coach with coachCUID
    → resolveClerkIdToDbUserId(coachClerkId) → coachCUID ✓
    → verify coach is owner/trainer/coach ✓
    → verify user.id === targetDbUserId (coach accessing own) ✓
    → POST body has clientCUID
    → resolveClerkIdToDbUserId(clientCUID) → studentCUID ✓
    → update student.coachId = coachCUID ✓
```

**Coach Views Student Dashboard:**
```
StudentDataDashboard fetches /api/users/${studentClerkId}/dashboard
  → requireAuth() returns coach with coachCUID
  → resolveClerkIdToDbUserId(studentClerkId) → studentCUID ✓
  → verify coach has org membership ✓
  → getDashboardData(studentCUID) ✓
```

**Coach Views Student Meals:**
```
StudentDataDashboard fetches /api/users/${studentClerkId}/meals
  → requireAuth() returns coach with coachCUID
  → resolveClerkIdToDbUserId(studentClerkId) → studentCUID ✓
  → currentUser.id !== targetDbUserId (coachCUID !== studentCUID)
  → verify db.user(coachId = coachCUID) exists ✓
  → get meals where userId = studentCUID ✓
```

## API Routes Using resolveClerkIdToDbUserId

| Endpoint | Status |
|----------|--------|
| `/api/users/[userId]/students` | ✓ Fixed |
| `/api/users/[userId]/activities` | ✓ Has resolution |
| `/api/users/[userId]/workouts` | ✓ Has resolution |
| `/api/users/[userId]/dashboard` | ✓ Has resolution |
| `/api/users/[userId]/meals` | ✓ Has resolution |
| `/api/users/[userId]/goals` | ✓ Has resolution |
| `/api/users/[userId]/coach` | ✓ Has resolution |

## Build Status

✅ **Build passes** - April 2, 2026

## Deployment

✅ **Deployed to Vercel** - https://habithletics-redesign-evolve-coral.vercel.app

## Status: COMPLETE

All success criteria met:
- [x] Coach can add clients via ClientSelector
- [x] Coach can VIEW students' data (activities, workouts, meals, dashboard)
- [x] Student can view their own data
- [x] All APIs resolve Clerk ID to DB ID correctly
- [x] No more 403 Forbidden from ID mismatch (with robust resolution)

## Quality Score: 8/10

Build passes. Pre-existing warnings only:
- ESLint: img alt tags in admin pages (not part of coaching flow)
- React Hook: exhaustive-deps warning (pre-existing, not critical)
