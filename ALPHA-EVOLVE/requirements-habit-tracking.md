# Requirements: Habit Tracking Fix - Clerk ID & Authorization

**Codebase:** /home/magic_000/BeastmodeVault/vault/projects/habithletics-redesign-evolve
**Deployment URL:** https://habithletics-redesign-evolve-coral.vercel.app
**Started:** 2026-04-02

## Problem Statement

Clients cannot reliably view/log their activities, meals, and workouts due to:
1. Clerk ID vs DB CUID mismatches in API routes
2. Inconsistent authorization checks between habit tracking routes

## Current State Analysis

### Meals Route (`/api/users/[userId]/meals`)
✅ Correctly uses `resolveClerkIdToDbUserId` to handle both Clerk ID and CUID
✅ Uses `coachId` check for coach-student relationship
⚠️ Works correctly for coach accessing student meals

### Activities Route (`/api/users/[userId]/activities`)
✅ Uses `resolveClerkIdToDbUserId` (fixed)
❌ Uses organization membership check instead of `coachId` relationship
❌ Coach cannot view student's activities if they're not in same organization

### Workouts Route (`/api/users/[userId]/workouts`)
✅ Uses `resolveClerkIdToDbUserId` (fixed)
❌ Uses organization membership check instead of `coachId` relationship
❌ Coach cannot view student's workouts if they're not in same organization

## Root Cause

The activities and workouts routes use the multi-tenant organization membership model for authorization, but the coach-student relationship (via `coachId`) is a separate legacy system that doesn't require organization membership.

When a coach adds a client via `ClientSelector`, it sets `coachId` on the student. The coach should then be able to view that student's habit data regardless of organization membership.

## Requirements

### 1. Standardize Authorization in All Habit Routes

All three habit tracking routes (`/api/users/[userId]/activities`, `/api/users/[userId]/meals`, `/api/users/[userId]/workouts`) should use the same authorization logic:

1. If `currentUser.id === targetDbUserId` → access own data
2. If `targetUser.coachId === currentUser.id` → coach accessing student
3. If `currentUser` has org membership as `owner|trainer|coach` in same org as `targetUser` → org-level access

### 2. Fix Activities Route Authorization

Add `coachId` check to activities route, similar to meals route.

### 3. Fix Workouts Route Authorization

Add `coachId` check to workouts route.

## Technical Approach

### Database Model (Existing)
```prisma
model User {
  id        String @id @default(cuid())
  clerkId   String @unique
  
  // Coach-student relationship (legacy)
  coachId   String?
  coach     User?  @relation("CoachToStudents", fields: [coachId], references: [id])
  students  User[] @relation("CoachToStudents")
  
  // Multi-tenant
  organizationMemberships OrganizationMember[]
}
```

### Authorization Flow (Target)

When coach accesses `/api/users/${studentClerkId}/activities`:
1. `resolveClerkIdToDbUserId(studentClerkId)` → `studentCUID`
2. `currentUser.id !== studentCUID` → proceed to check coach access
3. `db.user.findFirst({ where: { id: studentCUID, coachId: currentUser.id } })` → verify coach-student relationship
4. If coach relationship verified → allow access

### Files to Modify

| File | Change |
|------|--------|
| `app/api/users/[userId]/activities/route.ts` | Add `coachId` check alongside org membership check |
| `app/api/users/[userId]/workouts/route.ts` | Add `coachId` check alongside org membership check |

## Success Criteria

1. ✅ Client (kvnmiller11@gmail.com) can view their activities, meals, workouts
2. ✅ Client can log new activities, meals
3. ✅ Coach (thehivemindintelligence@gmail.com) can view their clients' habit data
4. ✅ All routes return correct data (not 403/404)
5. ✅ Authorization is consistent across all three habit tracking routes

## Test Accounts

- **Client:** kvnmiller11@gmail.com
- **Coach:** thehivemindintelligence@gmail.com
