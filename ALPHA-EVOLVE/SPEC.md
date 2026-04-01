# SPEC.md — Coach Add Client Fix

**Project:** habithletics-redesign-evolve
**Date:** 2026-04-01
**Alpha-Evolve Loop:** Coach Add Client Fix
**Deployment:** https://habithletics-redesign-evolve-coral.vercel.app

---

## 1. Functionality Specification

### Issue 1: "Add as Client" Returns 403 Forbidden (CRITICAL)

**Root Cause:**
- `ClientSelector` receives `coachId` which is the **Clerk ID** (from `useUser().id`)
- It calls `POST /api/users/${coachId}/students` with the Clerk ID in the URL
- The students route's `requireAuth()` returns a user object where `user.id` is the **internal database ID** (CUID)
- The authorization check `user.id !== params.userId` compares DB ID vs Clerk ID → never matches → 403

**Fix:**
1. In `ClientSelector.addAsClient()`, first look up the current user's DB ID from `/api/users/me`
2. Use the DB ID when calling the students endpoint
3. Add a `role === "coach"` check in the students POST endpoint as a safeguard

### Issue 2: Client Search Only Works by Email (HIGH — Already Fixed)

**Status:** The search API (`/api/users/search/route.ts`) already supports both `name` and `email` via `OR` query with `mode: "insensitive"`. No code change needed here.

**ClientSelector** calls `/api/users/search?query=${searchQuery}` which already works for name + email.

---

## 2. Technical Approach

### File Changes

#### A. `components/coach/ClientSelector.tsx`

**Problem:** `coachId` prop is a Clerk ID, but the API expects DB ID.

**Fix:** Add a helper function that resolves Clerk ID → DB ID before calling the add-client API.

```tsx
// In addAsClient():
// 1. First get the current user's DB ID from /api/users/me
// 2. Use that DB ID in the POST to /api/users/${dbId}/students
```

#### B. `app/api/users/[userId]/students/route.ts`

**Problem:** No role check; authorization could be improved.

**Fix:** Add a coach role check in the POST handler:
- `requireAuth()` ensures a valid authenticated user
- Check `user.role === "coach"` before allowing student assignment
- The existing `user.id !== params.userId` guard ensures a coach can only add students to themselves

---

## 3. File Structure

```
habithletics-redesign-evolve/
├── components/
│   └── coach/
│       └── ClientSelector.tsx       ← FIX: Resolve DB ID before API call
├── app/
│   └── api/
│       └── users/
│           └── [userId]/
│               └── students/
│                   └── route.ts      ← FIX: Add coach role check
└── ALPHA-EVOLVE/
    └── SPEC.md                      ← This file
```

---

## 4. Dependencies

No new dependencies required. The codebase already has:
- `db` (Prisma client) — already imported in routes
- `requireAuth` from `@/lib/auth-utils` — already used in routes
- Clerk `useUser()` hook — already used in ClientSelector

---

## 5. Migration Plan

### Phase 1: Fix ClientSelector.tsx
1. Add a state variable `currentUserDbId` to store the resolved DB ID
2. On component mount, fetch `/api/users/me` to get the DB ID
3. In `addAsClient()`, use `currentUserDbId` instead of `coachId` for the API call

### Phase 2: Fix students route
1. In the POST handler, after `requireAuth()`, add:
   ```ts
   if (user.role !== "coach") {
     return new NextResponse("Forbidden - Coach access required", { status: 403 })
   }
   ```

### Phase 3: Verification
1. Sign in as coach (`bmp19076@gmail.com`)
2. Navigate to `/dashboard/coaching`
3. Search for a client by name or email
4. Click "Add as Client"
5. Verify 200 response and client appears in student dashboard

---

## 6. API Contract

### GET `/api/users/me`
**Response:** `{ id, clerkId, name, email, image, role, ... }`

### POST `/api/users/[userId]/students`
**Auth:** Requires authenticated user with `role === "coach"`
**URL param:** `[userId]` = coach's internal database ID
**Body:** `{ clientId: string }` — the client's internal database ID
**Response:** `{ id, clerkId, name, email, image }` of updated client
**Errors:**
- 401 Unauthorized
- 403 Forbidden (not a coach, or trying to modify another coach's students)
- 404 Client not found
- 400 Missing clientId

### GET `/api/users/search?query=<q>`
**Auth:** Requires authenticated user
**Query params:** `query` (search string), optional `role` filter
**Response:** Array of `{ id, name, email, image, role }` (max 10, excludes current user)
**Search fields:** `name` OR `email` (case-insensitive, partial match)

---

## 7. Test Accounts

| Role  | Email                      | Password   | DB ID Known |
|-------|---------------------------|------------|-------------|
| Coach | bmp19076@gmail.com        | (use app)  | via /api/me |
| Client| thehivemindintelligence@gmail.com | (use app) | via /api/me |

---

## 8. Out of Scope (No Changes Needed)

- `app/api/users/search/route.ts` — already supports name + email search
- `app/api/users/[userId]/coach/route.ts` — not involved in coach→client flow
- `CoachSelector.tsx` — student selecting a coach (different flow)
