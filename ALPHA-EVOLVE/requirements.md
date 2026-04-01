# Alpha-Evolve Requirements: Option C - Clerk ID Standardization

## Project
Habithletics - Health Coaching Webapp

## Context
We've been patching the same Clerk ID vs DB CUID mismatch bug repeatedly. Each fix introduces new bugs. The foundation is cracked.

## The Problem

### IDENTITY CRISIS
The system has THREE conflicting identity systems:

1. **Clerk Auth** provides `user.id` = Clerk ID format (`user_xxx`)
2. **Database User table** has `User.id` = internal CUID (`cmncxxx`)
3. **Database User.clerkId** = Clerk ID (stored for reference)

Every API route that does `where: { userId: user.id }` is comparing Clerk ID against DB CUID — they NEVER match.

### ROLE CHAOS
Three role systems, all out of sync:

1. `User.role` — "user", "coach" (manually set, rarely updated)
2. `OrganizationMember.role` — "owner", "trainer", "coach" (correct, used for access)
3. `Clerk publicMetadata.role` — supposed to sync, never did

Result: UI checks one, backend checks another, nothing is consistent.

## Option C: Standardize on Clerk IDs

### Core Principle
**Clerk ID is THE external identifier.** Clerk is the source of truth for auth. Use Clerk IDs everywhere externally, resolve to DB CUIDs only when needed for internal database operations.

### Implementation Plan

1. **Audit ALL places that use `user.id`**
   - Every API route with `[userId]` param
   - Every page that passes user ID in URL
   - Every database query using `user.id`

2. **Establish the pattern:**
   ```
   Clerk (user.id) → URL/API params → resolve via clerkId lookup → DB operations
   ```

3. **Create a utility function:**
   ```typescript
   // Resolves Clerk ID to DB User record
   async function getUserByClerkId(clerkId: string) {
     return db.user.findFirst({ where: { clerkId } })
   }
   
   // Gets the DB CUID for the current authenticated user
   async function getCurrentDbUser(clerkUserId: string) {
     return db.user.findFirst({ where: { clerkId: clerkUserId } })
   }
   ```

4. **Fix the role system:**
   - ONE source of truth: `OrganizationMember.role` for access control
   - `User.role` is decorative only (can keep for display)
   - Remove `Clerk publicMetadata.role` checks from backend entirely
   - Sync role changes through the OrganizationMember table

5. **Files to audit (at minimum):**
   - `lib/session.ts` — getCurrentUser() returns DB User with clerkId field
   - `lib/api/workouts.ts` — uses user.id for queries
   - `app/api/users/[userId]/*` — all routes
   - `app/dashboard/workouts/[workoutId]/edit/page.tsx`
   - `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`
   - `app/trainer/layout.tsx`
   - `app/dashboard/layout.tsx`
   - `components/workout/workout-edit-form.tsx`
   - Any file doing `db.organizationMember.findFirst({ where: { userId: user.id }})`

6. **Test comprehensively:**
   - Sign in as bmp19076 (Coach Kevin) — verify all coach features work
   - Sign in as kvnmiller11 (Client) — verify client features work
   - Video selector appears for coach
   - Client management works for coach
   - No redirects to /dashboard

## Quality Gates
- CRITICAL issues: 0 allowed
- HIGH issues: 0 allowed
- MEDIUM issues: < 3 allowed
- Keep looping until gates pass

## Success Criteria
1. ALL API routes use Clerk ID as external identifier
2. ALL database lookups resolve Clerk ID → DB CUID before querying
3. OrganizationMember.role is THE source of truth for access control
4. Coach Kevin can see all coach features (clients, programs, video selector)
5. Client kvnmiller11 sees only client features
6. No more "user.id vs clerkId" confusion anywhere in codebase