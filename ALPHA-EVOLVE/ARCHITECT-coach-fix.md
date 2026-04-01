# Architect Report: Coach Kevin (bmp19076) — Two UI Issues

**Date:** 2026-04-01
**Architect Phase**

---

## Known Database State

| Field | Value |
|-------|-------|
| Email | bmp19076@gmail.com |
| User.id (CUID) | `cmnc6zhqe00006k3h9gg2pm2c` |
| User.role | `"user"` ⚠️ |
| User.clerkId | `user_30i7HVsu07CLHiXWSnDQv1BmVKz` |
| OrganizationMember.role | `"coach"` (Habithletics Gym) |
| Habithletics Gym videos | 10+ with `status='ready'` AND `muxPlaybackId != null` |

---

## Issue 1: "Add clients through your organization" Message

### Where the message appears

**File:** `app/trainer/clients/page.tsx` (line ~95)

```tsx
{clients.length === 0 ? (
  <Card>
    <CardContent className="flex flex-col items-center justify-center h-48">
      <p className="text-muted-foreground mb-4">No clients yet</p>
      <p className="text-sm text-muted-foreground">Add clients through your organization</p>
    </CardContent>
  </Card>
```

### Why clients.length is always 0

The page fetches organizations via `GET /api/organizations` (line ~59-78), which returns each org with `userRole: m.role` (the OrganizationMember.role).

Then on **line 73**, it filters:

```tsx
if (["owner", "trainer"].includes(org.userRole)) {
```

**Root cause:** The `"coach"` role is NOT in the allowed list. Coach Kevin's `org.userRole` is `"coach"` (from his OrganizationMember record), so he is excluded. His clients are never fetched → `clients.length === 0` → message shows.

### Fix Approach

**File:** `app/trainer/clients/page.tsx` line 73

Change:
```tsx
if (["owner", "trainer"].includes(org.userRole)) {
```
To:
```tsx
if (["owner", "trainer", "coach"].includes(org.userRole)) {
```

This is a one-line change. The "coach" role was simply omitted from the role filter.

---

## Issue 2: Video Selector Not Appearing on Workout Edit Page

### The Flow

The coach likely tries to edit **student workouts** via `/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit` (the coach-specific route), NOT the generic `/dashboard/workouts/[workoutId]/edit` (which is for their own workouts).

### Root Cause: Two separate problems

#### Problem A — The route he should use redirects him away

**File:** `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`

Line 34:
```tsx
// Verify user is a coach using fresh database data
if (dbUser?.role !== "coach") {
  redirect("/dashboard")
}
```

This checks `db.user.role === "coach"`. Coach Kevin has `User.role: "user"` in the database. Therefore, every time he tries to access a student's workout edit page, he gets redirected to `/dashboard`.

The `User.role` field was never set to `"coach"` for bmp19076 — only their `OrganizationMember.role` was set to `"coach"`.

#### Problem B — The membership/isTrainer check DOES work

In the same file (lines 86-105):
```tsx
const membership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ['owner', 'trainer', 'coach'] }
  },
  include: { organization: true }
})

if (membership || dbUser?.role === 'coach') {
  isTrainer = true
  organizationVideos = membership ? await db.organizationVideo.findMany({...}) : []
}
```

This membership check WOULD succeed — it correctly finds the coach's OrganizationMember record with role `"coach"`. The `isTrainer` flag would be `true` and `organizationVideos` would be populated.

**BUT** — Problem A prevents the coach from ever reaching this code because the `dbUser?.role !== "coach"` check on line 34 fires first and redirects him.

### Why the Generic Workout Edit Page Isn't the Right Route

**File:** `app/dashboard/workouts/[workoutId]/edit/page.tsx`

The `getWorkout(params.workoutId, user.id)` call at line 26 requires `workout.userId === authorizedUserId`. If Coach Kevin has no personal workouts (he only coaches students), this returns `null` → `notFound()` (404 page). Even if he has personal workouts, the videos should appear via the same `isTrainer` logic.

The coach's primary workflow is editing **students' workouts**, which requires the coaching sub-route — but that route blocks him.

### Fix Approach (Two Changes Required)

#### Fix 2A — Update User.role to "coach" (Database)

This is the underlying data inconsistency. Coach Kevin's organization membership has `role: "coach"`, but `User.role` is still `"user"`.

**Recommendation:** Run a database update:
```sql
UPDATE "User" SET "role" = 'coach' WHERE "clerkId" = 'user_30i7HVsu07CLHiXWSnDQv1BmVKz';
```

Or via Prisma:
```js
await db.user.update({
  where: { clerkId: 'user_30i7HVsu07CLHiXWSnDQv1BmVKz' },
  data: { role: 'coach' }
})
```

This alone would fix the coaching page and the student workout edit redirect. However, for a more robust solution (so future coaches don't hit this), also apply Fix 2B.

#### Fix 2B — Use OrganizationMember role for coach authorization in student workout edit

**File:** `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx`

Replace the strict `dbUser?.role !== "coach"` check with a check that also accepts OrganizationMember roles:

Change from:
```tsx
// Verify user is a coach using fresh database data
if (dbUser?.role !== "coach") {
  redirect("/dashboard")
}
```

Change to:
```tsx
// Check coach status via OrganizationMember (covers owner/trainer/coach)
// Only block if user has NO organizational coach relationship
const membership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ['owner', 'trainer', 'coach'] }
  }
})
const dbUser = await db.user.findUnique({
  where: { id: user.id },
  select: { role: true }
})
if (!membership && dbUser?.role !== 'coach') {
  redirect("/dashboard")
}
```

This way the page is accessible to:
1. Users with `User.role === "coach"`
2. Users with `OrganizationMember.role` of `"coach"`, `"trainer"`, or `"owner"`

### Summary of Video Selector Issue

| Check | Result | Why |
|-------|--------|-----|
| `User.role` in DB | `"user"` | Not set to coach — FAILS coach page check |
| `OrganizationMember.role` | `"coach"` | Would PASS the membership check |
| Videos exist? | Yes (10+ ready) | Would PASS |
| `isTrainer` computed | Would be `true` | IF page was reached |

**Root cause:** User.role is "user" instead of "coach", causing the student workout edit page to redirect before the video selector can render.

---

## Files That Need Changes

| # | File | Change |
|---|------|--------|
| 1 | `app/trainer/clients/page.tsx` | Line 73: add `"coach"` to `["owner", "trainer"]` role filter |
| 2 | Database | UPDATE `User.role` to `"coach"` for bmp19076 (clerkId: `user_30i7HVsu07CLHiXWSnDQv1BmVKz`) |
| 3 | `app/dashboard/coaching/students/[studentId]/workouts/[workoutId]/edit/page.tsx` | Replace strict `dbUser?.role !== "coach"` check with OrganizationMember-based check |

---

## Execution Order

1. **Fix 1** (trainer clients page) — simple role filter fix
2. **Fix 2** (database) — set User.role to "coach" for bmp19076
3. **Fix 3** (student workout edit page) — robust role check using OrganizationMember

Fix 1 and Fix 3 can be deployed independently. Fix 2 (database update) is required for the coaching dashboard UI to work properly at all (since `/dashboard/coaching/page.tsx` also checks `user?.publicMetadata?.role === "coach"` which depends on User.role being correct).

---

## Additional Observations

- The `app/dashboard/coaching/page.tsx` page uses `user?.publicMetadata?.role === "coach"` from Clerk's session metadata. If `User.role` is updated to "coach" in the database, there may be a separate sync mechanism needed to propagate this to Clerk's `publicMetadata`. The "Become a Coach" button in that page calls `PATCH /api/users/${userId}/role` with `{ role: "coach" }` — this API should be checked to ensure it updates both `User.role` AND syncs to Clerk's `publicMetadata`.
- The `/trainer/clients` page uses a different (older) code path than the `/dashboard/coaching` page. The former uses the organization-based client model; the latter uses the direct `coachId` on User model. These represent two different client management paradigms that may need to be reconciled.
