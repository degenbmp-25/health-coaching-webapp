# Evolution Log - Clerk ID Standardization

## Loop 1: Initial Fix

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

### Root Cause Identified

The issue was a mismatch between:
- Frontend storing and passing CUIDs (from `/api/users/me` response's `id` field)
- API routes expecting Clerk IDs and calling `resolveClerkIdToDbUserId()` to convert

When ClientSelector called `/api/users/${coachCUID}/students`:
- API received CUID `clndCoach`
- `resolveClerkIdToDbUserId("clndCoach")` looked for user with `clerkId = "clndCoach"`
- No user found → 404 before authorization check

### Solution

Made the API's ID resolution function robust to handle both ID formats. This minimizes frontend changes while fixing the backend to be more forgiving.

## Quality Score: 7/10

Build passes. Warnings are pre-existing (img tags, exhaustive-deps).

## Status: DEPLOYED

Production URL: https://habithletics-redesign-evolve-coral.vercel.app
