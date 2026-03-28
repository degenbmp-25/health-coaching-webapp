# Alpha-Evolve Bug Fixes

**Date:** 2026-03-28  
**Branch:** multi-tenant-v1

## Issues Fixed

### CRITICAL #1: Route Mismatch in removeMember()
**File:** `app/admin/organizations/[id]/page.tsx:47`

**Problem:** `removeMember()` called `DELETE /api/organizations/${id}/members/${memberId}` but the API route expects `DELETE /api/organizations/${id}/members` with `userId` in the **body**.

**Fix:** Updated client to send `userId` in request body:
```typescript
const res = await fetch(`/api/organizations/${id}/members`, {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: memberId }),
})
```

---

### CRITICAL #2: User Lookup by Wrong ID
**File:** `app/api/users/[userId]/route.ts:16-45`

**Problem:** GET handler compared `params.userId === user.clerkId`, but the trainer UI passes the **database UUID** in the URL, not the Clerk ID.

**Fix:** Changed all lookups to use database UUID (`id`) instead of Clerk ID (`clerkId`):
- Self-check: `params.userId === user.id` (was `user.clerkId`)
- Database queries now use `where: { id: params.userId }` instead of `where: { clerkId: params.userId }`

---

### CRITICAL #3: Wrong Role Check
**File:** `app/api/users/[userId]/route.ts:36`

**Problem:** Check used `user.role === "coach"`, but in multi-tenant model, trainer role is stored in `OrganizationMember.role`, not `User.role`.

**Fix:** Replaced User.role check with OrganizationMember query:
```typescript
const requestingUserMembership = await db.organizationMember.findFirst({
  where: {
    userId: user.id,
    role: { in: ["owner", "trainer"] },
  },
})
```

Also applied same fix to PATCH handler for consistency.

---

### HIGH #1: Empty admin/sheets/ Directory
**File:** `app/admin/sheets/`

**Problem:** Directory existed but was empty - no admin sheet management UI.

**Fix:** Removed unused empty directory. Sheet connections are managed via the organization detail page's "Sheet Connections" tab instead.

---

## Verification

- TypeScript check: `npx tsc --noEmit` ✓ No errors
