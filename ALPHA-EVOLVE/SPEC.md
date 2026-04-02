# SPEC.md - Habithletics Clerk ID Standardization

## Problem Statement

Clerk IDs (format: `user_xxx`) and Database CUIDs (format: `clndxxx`) are being mixed throughout the codebase, causing 403 Forbidden errors when coaches try to view their students' data.

### Root Cause

1. **Frontend sources:**
   - `useUser().id` returns Clerk ID (e.g., `user_2abc123`)
   - `/api/users/me` returns user object with both `id` (CUID) and `clerkId` (Clerk ID)

2. **Frontend stores CUID instead of Clerk ID:**
   - Components like `ClientSelector` and `CoachingPage` call `/api/users/me`, store `user.id` (CUID), and use it in API URLs
   - But API routes expect Clerk IDs and call `resolveClerkIdToDbUserId()` to convert

3. **API route pattern:**
   - URL params: expect Clerk ID
   - `resolveClerkIdToDbUserId(params.userId)` converts Clerk ID → CUID for DB queries
   - When passed CUID instead of Clerk ID, resolution fails (looks for `clerkId = "clndxxx"` which doesn't exist)

### Affected Files

| File | Issue |
|------|-------|
| `app/dashboard/coaching/page.tsx` | Uses `currentUserDbId` (CUID) in `/api/users/${currentUserDbId}/students` |
| `components/coach/ClientSelector.tsx` | Uses `currentUserDbId` (CUID) in `/api/users/${currentUserDbId}/students` |
| `components/coach/StudentDataDashboard.tsx` | Uses `selectedStudent.clerkId` correctly in most places |
| `lib/api/id-utils.ts` | `resolveClerkIdToDbUserId` only handles Clerk IDs, not CUIDs |

### Authorization Flow (Working Case)

When coach views student's meals via `/api/users/${studentClerkId}/meals`:
1. API receives Clerk ID `user_student`
2. `resolveClerkIdToDbUserId("user_student")` → returns CUID `clndStudent`
3. `db.user.findFirst({ where: { id: clndStudent, coachId: coachCUID } })` verifies relationship
4. If `coachId = coachCUID` exists → access granted

### Authorization Flow (Broken Case - ClientSelector)

When coach adds client via `/api/users/${coachCUID}/students`:
1. API receives CUID `clndCoach` in URL
2. `resolveClerkIdToDbUserId("clndCoach")` looks for user with `clerkId = "clndCoach"` → NOT FOUND
3. Returns 404 before even checking authorization

## Solution

### Fix 1: Update id-utils.ts to Handle Both Clerk IDs and CUIDs

The `resolveClerkIdToDbUserId` function should:
- If input looks like Clerk ID (`user_` prefix) → resolve via `clerkId` field
- If input is CUID (no `user_` prefix) → assume it's already a CUID and verify user exists
- Return null if neither works

### Fix 2: Ensure Consistent Clerk ID Usage in URLs

**Option A (Chosen):** Make `resolveClerkIdToDbUserId` robust to handle both
- Minimizes frontend changes
- Backend becomes more forgiving

**Changes needed:**
1. `lib/api/id-utils.ts` - update `resolveClerkIdToDbUserId`
2. `app/dashboard/coaching/page.tsx` - pass Clerk ID to students endpoint
3. `components/coach/ClientSelector.tsx` - pass Clerk ID to students endpoint

## Files to Modify

| File | Change |
|------|--------|
| `lib/api/id-utils.ts` | Update `resolveClerkIdToDbUserId` to handle CUIDs directly |
| `app/dashboard/coaching/page.tsx` | Use Clerk ID (`user.id`) instead of CUID (`currentUserDbId`) in API calls |
| `components/coach/ClientSelector.tsx` | Use Clerk ID instead of CUID for coach identification |

## Success Criteria

1. ✅ Coach can add clients via ClientSelector
2. ✅ Coach can view students' activities, workouts, meals, dashboard
3. ✅ Student can view their own data
4. ✅ All API routes resolve IDs correctly
5. ✅ No 403 Forbidden from ID mismatch

## Technical Details

### Clerk ID Pattern
- Format: `user_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (26 characters)
- Source: `useUser().id` from `@clerk/nextjs`

### CUID Pattern
- Format: `clndxxxxxxxxxxxxxxxxxxxxxxxx` (25 characters)
- Source: `user.id` from `/api/users/me` response
- Stored in: `db.user.id`, `db.user.coachId`, `db.organizationMember.userId`

### Resolution Strategy

```typescript
async function resolveClerkIdToDbUserId(id: string): Promise<string | null> {
  // If already a CUID (starts with 'clnd'), verify and return
  if (id.startsWith('clnd')) {
    const user = await db.user.findUnique({ where: { id }, select: { id: true } })
    return user?.id ?? null
  }
  
  // If Clerk ID (starts with 'user_'), resolve via clerkId field
  if (id.startsWith('user_')) {
    const user = await db.user.findFirst({ where: { clerkId: id }, select: { id: true } })
    return user?.id ?? null
  }
  
  // Unknown format
  return null
}
```
