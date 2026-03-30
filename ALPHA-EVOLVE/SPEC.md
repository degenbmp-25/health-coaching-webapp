# Habithletics Alpha-Evolve - Loop 4 SPEC

## Root Causes

### Issue 1: "View" button doesn't navigate

**File:** `app/trainer/clients/page.tsx`

**Root Cause:** The "View →" button has NO `onClick` handler. It relies on click bubbling from the parent div's `onClick`. BUT the Button component (from shadcn/ui) internally uses an `<a>` tag or calls `e.stopPropagation()`, which breaks the bubbling.

```tsx
// CURRENT (broken)
<div onClick={() => router.push(`/trainer/clients/${client.id}`)}>
  ...
  <Button variant="ghost" size="sm">View →</Button>  {/* No onClick! */}
</div>
```

**Fix:** Add explicit `onClick` to the button:
```tsx
<Button variant="ghost" size="sm" onClick={() => router.push(`/trainer/clients/${client.id}`)}>
  View →
</Button>
```

### Issue 2: "habithletics gym" Badge is a dead link

**File:** `app/trainer/clients/page.tsx`

**Root Cause:** The Badge shows the organization name but is not clickable. It's just styled text.

```tsx
// CURRENT - Badge is not clickable
<Badge variant="outline">{client.organizationName}</Badge>
```

**Fix Options:**
1. Remove the clickable styling (cursor-default)
2. Link to organization detail page if that exists
3. Keep as-is but add cursor-pointer and tooltip explaining it's not clickable

**Decision:** Make it plain text (not a Badge) since there's no meaningful destination.

### Issue 3: Mobile nav disappears on detail pages

**File:** `app/dashboard/layout.tsx`

**Root Cause:** The layout is a SERVER component that checks DB membership on each request. If:
1. The API call to check membership fails
2. Or the user isn't found in organization_members table
3. Or there's a re-render issue

Then `canAccessTrainer` becomes `false` and the trainer nav section disappears.

The mobile nav is conditionally rendered based on `canAccessTrainer`:
```tsx
const mobileLinks = canAccessTrainer 
  ? [...dashboardLinks.data, ...trainerLinks.data]
  : dashboardLinks.data
```

**Fix:** 
1. Add error handling for the membership check
2. Consider caching the trainer access state
3. Or always show the trainer nav if user is authenticated (graceful degradation if no access)

## Files to Change

| File | Change |
|------|--------|
| `app/trainer/clients/page.tsx` | Add onClick to "View" button; change Badge to plain text |
| `app/dashboard/layout.tsx` | Add try-catch around membership check; always show trainer nav for authenticated users |

## Success Criteria

1. ✅ Clicking "View →" navigates to client detail page
2. ✅ Organization name is not misleadingly styled as a link
3. ✅ Navigation is always visible on all pages for authenticated trainers
4. ✅ Mobile nav shows trainer section on trainer pages
