# ALPHA-EVOLVE Review — multi-tenant-v1

## Executive Summary

**Quality Score: 5/10**  
**Production Ready: NO**

The multi-tenant schema is well-designed, TypeScript compiles clean, and most API routes have proper auth. However, there are **3 CRITICAL bugs** that will cause runtime failures and **2 HIGH** issues that must be fixed before deployment.

---

## Critical Issues (Blocks Deployment)

### CRITICAL-1: Member Remove — UI/API Route Mismatch

**File:** `app/admin/organizations/[id]/page.tsx`  
**Line:** ~47

```typescript
// UI calls URL with memberId in path:
const res = await fetch(`/api/organizations/${id}/members/${memberId}`, {
  method: "DELETE",
})
```

**Problem:** The API route at `app/api/organizations/[id]/members/route.ts` DELETE handler expects `userId` in the **request body**, NOT in the URL path. The route signature is:

```typescript
// API expects DELETE /api/organizations/:id/members with body { userId }
const json = await req.json()
const body = removeMemberSchema.parse(json) // { userId: z.string().min(1) }
```

**Result:** The UI will send `DELETE /api/organizations/org123/members/mem456` but the API handler at `.../members/` won't match that path (no route for `.../members/:memberId`), causing a 404 or the DELETE will go to the wrong handler.

**Fix:** Either:
- Change UI to send `DELETE /api/organizations/${id}/members` with body `{ userId: memberId }`, OR
- Create a new route file at `[id]/members/[memberId]/route.ts` with a DELETE handler

---

### CRITICAL-2: User API — ID Type Confusion (clerkId vs db id)

**File:** `app/api/users/[userId]/route.ts`  
**Lines:** 16-45

```typescript
// GET handler checks if params.userId (URL param) equals user.clerkId
if (params.userId === user.clerkId) { ... }
```

**Problem:** The frontend pages pass the **database `id`** (e.g., `client.id = m.user.id` from Prisma result) in the URL, NOT the Clerk ID.

Example from `app/trainer/clients/page.tsx`:
```typescript
// client.id is the database UUID, NOT clerkId
router.push(`/trainer/clients/${client.id}`)
// Then /trainer/clients/[id]/page.tsx calls:
const res = await fetch(`/api/users/${id}`) // id = db id, not clerkId
```

The API route then tries to match `params.userId` (db id) against `user.clerkId` (Clerk's string ID) — they will **never** match.

**Result:** The trainer client detail page at `app/trainer/clients/[id]/page.tsx` expects `programAssignments` and `workoutSessions` in the response, but the API falls through to the "limited public info" case which only returns `{ id, name, image }`.

**Fix:** The API route should query by `db.id` (database UUID), not by `clerkId`. Change all `clerkId` lookups in the GET handler to use the database `id` field, or create a separate endpoint pattern.

---

### CRITICAL-3: Trainer Client Detail — Access Check Uses Wrong Role Field

**File:** `app/api/users/[userId]/route.ts`  
**Line:** ~36

```typescript
// This check will NEVER pass for multi-tenant trainers
if (user.role === "coach") {
  const student = await db.user.findFirst({
    where: { clerkId: params.userId, coachId: user.id },
    ...
  })
}
```

**Problem:** In the multi-tenant architecture, a trainer's role is stored in `OrganizationMember.role`, NOT in `User.role`. The `User.role` field only contains `"user"` or `"coach"` (legacy), while `"trainer"` is stored in `organizationRole` or per-organization membership.

The coach-based student check (`coachId` field on User) is the **legacy** relationship — it should use the multi-tenant `OrganizationMember` check instead.

**Fix:** Replace with multi-tenant check: verify requester is an `owner` or `trainer` in any `OrganizationMember` entry shared with the target user.

---

## High Priority Issues

### HIGH-1: Missing `programAssignments` and `workoutSessions` Relations on User

**File:** Schema `prisma/schema.prisma`  
**Problem:** The `User` model does NOT have `programAssignments` or `workoutSessions` relations. However, `app/trainer/clients/[id]/page.tsx` defines these in the `ClientData` interface and renders them:

```typescript
// trainer/clients/[id]/page.tsx expects:
client.programAssignments: Array<{ id: program: { id, name, description, workouts } }>
client.workoutSessions: Array<{ id, workout: { name }, status, completedAt, startedAt }>
```

The User model in schema.prisma has:
```
organizationMemberships, createdPrograms, programAssignments, sheetConnections
```

Wait — `programAssignments` IS listed. Let me re-check the schema... Yes it's there: `programAssignments ProgramAssignment[] @relation("ClientPrograms")`. So the relation exists. But the API route (`/api/users/[userId]`) never returns it because of CRITICAL-2 above.

**HIGH-1 status updated:** The relation exists in the schema but the API route doesn't return it because of the clerkId/db-id mismatch.

### HIGH-2: Empty `app/admin/sheets/` Directory

**File:** `app/admin/sheets/`  
**Problem:** The `app/admin/sheets/` directory is empty — no `page.tsx`. This means the admin sheets route exists as an API (`/api/sheets/connect`) and as a trainer page (`/trainer/sheets/page.tsx`), but admins have no UI to view/manage sheet connections.

---

## Medium / Low Issues

### MEDIUM-1: Prisma Validate Requires DATABASE_URL

**File:** `.env`  
**Problem:** `.env` only has `DIRECT_URL=postgres://placeholder` but no `DATABASE_URL`. `npx prisma validate` fails with P1012 because `schema.prisma` requires `DATABASE_URL`.

This is a **setup/environment issue**, not a code bug. Will fail on any fresh clone.

### LOW-1: `app/admin/sheets/` page navigation is broken

Even though the API supports it, there's no UI route for `/admin/sheets`.

### LOW-2: `app/admin/organizations/[id]/page.tsx` `removeMember` bug

The UI shows a remove button on member rows but the DELETE call will 404.

---

## What Works Well

- **TypeScript**: `npx tsc --noEmit` passes with EXIT_CODE 0. No type errors.
- **Schema Design**: Multi-tenant models (Organization, OrganizationMember, Program, ProgramAssignment, SheetConnection) are well-structured with proper relations and unique constraints.
- **Clerk Auth**: `lib/session.ts` properly integrates Clerk with auto-user-creation on first login.
- **API Error Handling**: Most routes have try/catch, Zod validation, proper HTTP status codes.
- **Organization API Routes**: Create/list/update/delete, member management, and permission checks all look solid.
- **Programs & Assignments**: API routes properly check organization membership before allowing operations.
- **Sheet Connections**: The `extractSheetId` helper is a nice touch.

---

## Line-by-Line Issues

| File | Line(s) | Severity | Issue |
|------|---------|----------|-------|
| `app/admin/organizations/[id]/page.tsx` | ~47 | CRITICAL-1 | `removeMember` calls `/api/.../members/${memberId}` DELETE, but API expects `/api/.../members` DELETE with body |
| `app/api/users/[userId]/route.ts` | 16-45 | CRITICAL-2 | GET handler compares `params.userId` with `user.clerkId`, but UI passes db `id` not `clerkId` |
| `app/api/users/[userId]/route.ts` | ~36 | CRITICAL-3 | `user.role === "coach"` check wrong for multi-tenant; should use `OrganizationMember` role |
| `app/admin/sheets/` | — | HIGH-2 | Directory exists but contains no `page.tsx` — no admin sheet management UI |
| `.env` | — | MEDIUM-1 | Missing `DATABASE_URL` env var — `prisma validate` fails |

---

## Recommendation

**DO NOT MERGE** until CRITICAL-1, CRITICAL-2, and CRITICAL-3 are resolved. These are functional bugs that will cause 404s, missing data, and permission failures in production.

Priority order:
1. Fix CRITICAL-1 (member remove mismatch) — easiest fix
2. Fix CRITICAL-2 (user API id confusion) — affects trainer client detail page
3. Fix CRITICAL-3 (coach role check) — permission bypass/inaccessibility
4. Add `app/admin/sheets/page.tsx` or remove the empty directory
5. Add `DATABASE_URL` to `.env` / `.env.example`
