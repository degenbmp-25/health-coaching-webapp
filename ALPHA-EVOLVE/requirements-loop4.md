# Habithletics Alpha-Evolve - Loop 4 Requirements

## Date: 2026-03-30

## Issues to Fix

### Issue 1: Non-functional Links in Trainer Clients Page

**Problem:** When clicking "view" on a client's row or "habithletics gym" link in the trainer clients page, nothing happens.

**Affected Page:** `/trainer/clients`
**Expected Behavior:** 
- Clicking "view" should navigate to client detail page (`/trainer/clients/[id]`)
- Clicking "habithletics gym" (organization name) should navigate to organization detail or be a no-op (external link)

**Likely Cause:** 
- The "view" button might have a missing or broken `onClick` handler
- The router.push might be failing silently
- The links might not be properly wrapped in clickable elements

### Issue 2: Navigation Dropdown Missing on Trainer Pages

**Problem:** The navigation dropdown on the left side disappears on trainer client detail pages (`/trainer/clients/[id]`), making it impossible to navigate back.

**Affected Pages:**
- `/trainer/clients/[id]`
- Potentially other `/trainer/*` detail pages

**Expected Behavior:**
- Navigation sidebar/dropdown should be present on ALL pages
- User should always be able to navigate back to main sections

**Likely Cause:**
- The Shell component or layout might not be properly wrapping these pages
- The trainer client detail page might not be using the standard layout
- Mobile nav might not be showing trainer section on these pages

---

## Requirements

### Requirement 1: Fix "view" link in trainer clients list
- When user clicks "view" button on a client's row, should navigate to `/trainer/clients/[clientId]`
- The client detail page should show the client's information, assigned programs, and workout history

### Requirement 2: Fix "habithletics gym" link behavior
- The "habithletics gym" text appears to be the organization name
- Should either navigate to the organization detail OR display as plain text (not a broken link)
- If it's meant to be clickable, it should go somewhere meaningful

### Requirement 3: Ensure navigation is present on ALL pages
- The sidebar navigation (desktop) should always show
- The mobile navigation dropdown should always be accessible
- No page should render without navigation options

### Requirement 4: Add navigation breadcrumb or back button
- If navigation IS present but hard to find, add a clear back button or breadcrumb
- User should never be stranded on a page with no way to navigate

---

## Success Criteria

1. ✅ Clicking "view" on a client row navigates to client detail page
2. ✅ Client detail page shows all expected content (programs, workouts)
3. ✅ Navigation is visible and functional on all trainer pages
4. ✅ No dead-end pages where user is stuck
5. ✅ Mobile nav shows trainer section when user is logged in as trainer

---

## Technical Notes

- This is a UI/routing bug, likely in the page components or navigation components
- Check if `/trainer/clients/[id]/page.tsx` is properly using the Shell layout
- Check if the trainer client detail page is correctly wrapped in the dashboard layout
- Verify the navigation state is properly maintained across route changes
