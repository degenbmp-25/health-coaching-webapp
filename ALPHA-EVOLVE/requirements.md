# Alpha-Evolve Requirements - Habithletics Workout Query Fix

**Project:** habithletics-redesign-evolve
**Date:** 2026-03-30
**Goal:** Fix workout queries to work with multi-tenant model

---

## Problem Statement

The app shows NO workouts because the database queries don't match the multi-tenant data model.

**Current state:**
- Database HAS workouts (5 workouts, 42 exercises imported via migration script)
- Workouts are assigned to Programs (via `workout.programId`)
- Users access workouts through ProgramAssignments
- BUT `getUserWorkouts()` queries `workout.userId = userId` → returns EMPTY

**The multi-tenant model:**
- Organization → has many Programs
- Program → has many Workouts
- User → has OrganizationMembership (owner/trainer/client role)
- Client → has ProgramAssignments linking them to Programs
- Workout → belongs to a Program (not directly to a User)

---

## Requirements

### 1. Fix Client Workout Query
**For clients**, workouts should come from Programs they're assigned to:

```typescript
// Current (WRONG):
getUserWorkouts(userId) → WHERE userId = userId

// Correct:
getUserWorkouts(userId) → 
  WHERE workout.programId IN (
    SELECT programId FROM program_assignments WHERE clientId = userId
  )
```

### 2. Fix Trainer Workout Query
**For trainers**, show workouts from their organization's programs:

```typescript
// Trainer sees workouts they/their org created
getTrainerWorkouts(trainerId) →
  WHERE workout.programId IN (
    SELECT p.id FROM programs p
    JOIN organizations o ON o.id = p.organizationId
    JOIN organization_members om ON om.organizationId = o.id
    WHERE om.userId = trainerId AND om.role IN ('owner', 'trainer')
  )
```

### 3. Respect Organization Context
- Users should only see workouts from their current organization context
- The current organization should be determined from their OrganizationMembership

---

## Technical Constraints

1. Keep existing Prisma schema (don't modify models)
2. Keep existing API route structure
3. Maintain backward compatibility where possible
4. Follow existing code patterns in `lib/api/workouts.ts`

---

## Files to Modify

1. `lib/api/workouts.ts` - Fix getUserWorkouts(), add getClientWorkouts(), add getTrainerWorkouts()
2. `app/dashboard/workouts/page.tsx` - May need to determine user role and call correct function
3. API routes under `app/api/users/[userId]/workouts/` - Update to use correct query

---

## Success Criteria

- [ ] Client user sees workouts from their assigned Programs
- [ ] Trainer sees workouts from their organization's Programs
- [ ] No workout data is lost (all 5 workouts + 42 exercises remain visible)
- [ ] Build passes without errors
- [ ] App loads workouts on first try

---

## Priority

P0 (MUST FIX): Workouts show at all
P1: Correct workout-to-user mapping
P2: Trainer vs Client distinction works
