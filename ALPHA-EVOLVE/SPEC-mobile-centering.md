# SPEC: Mobile Centering Fix

**Date:** 2026-04-07
**Status:** Draft
**Priority:** High

---

## Problem Statement

Dashboard (`app/dashboard/page.tsx`) and Activities (`app/dashboard/activities/page.tsx`) pages have content that is off-center on mobile viewports (375px width). The secondary navigation/menu appears to interfere with content centering.

---

## Root Cause Analysis

### 1. Shell Component — Missing Centering and Width Constraint

**File:** `components/layout/shell.tsx`

```tsx
// CURRENT (line 10-12)
<div className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-0", className)} {...props}>
```

**Issues:**
- No `mx-auto` — Shell does not center itself; it stretches to fill available space
- No `max-w-*` constraint — On mobile without a constraining parent, Shell can expand unbounded
- `md:px-0` removes horizontal padding at the exact breakpoint (md/768px) where the 200px sidebar appears, potentially leaving content un-padded on tablets

**Why this matters:** On mobile, Shell's `px-4` provides 16px padding. But without `mx-auto` + `max-w`, Shell depends on a parent width constraint. If any child component breaks out or has an unbounded width, horizontal overflow occurs.

### 2. Dashboard Layout — No Explicit Max-Width on Main Content

**File:** `app/dashboard/layout.tsx`

```tsx
// CURRENT (line 52)
<main className="flex w-full flex-1 flex-col relative">
```

**Issue:** `w-full` on `<main>` provides 100% of the available column width, but there's no `max-w` constraint to cap it. On very wide desktop screens, this allows Shell to expand to the full available space, which may not match the intended content width.

### 3. MobileNav Dialog — Fixed Positioning Overlays Content

**File:** `components/layout/mobile-nav.tsx`

```tsx
// CURRENT (line 37)
<DialogContent className="w-80 max-w-80 p-0 left-4 translate-x-0">
```

**Issue:** `left-4 translate-x-0` anchors the drawer 16px from the left edge. When the drawer opens, it overlays content. If Shell content has no left padding buffer, the hamburger menu button (`top-20 left-4`) could visually compete with content on narrow viewports.

---

## Specific Files & Lines Requiring Changes

### 1. `components/layout/shell.tsx` (Primary Fix)

**Line 10:** Add `mx-auto` and `max-w-7xl` to center and constrain Shell width.

| | Before | After |
|---|---|---|
| Line 10 | `className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-0", className)}` | `className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 lg:px-0 mx-auto w-full max-w-7xl", className)}` |

**Changes:**
- `mx-auto` — Centers Shell within its container
- `w-full` — Ensures Shell fills available space up to max-width
- `max-w-7xl` (1280px) — Caps width; prevents unbounded expansion on wide screens
- `lg:px-0` instead of `md:px-0` — Maintains padding at md breakpoint (768px+) where the 200px sidebar exists, removing padding only at lg (1024px+) where there's more space

### 2. `app/dashboard/layout.tsx` (Secondary Fix)

**Line 52:** Add `max-w-7xl mx-auto` to constrain and center the main content area.

| | Before | After |
|---|---|---|
| Line 52 | `<main className="flex w-full flex-1 flex-col relative">` | `<main className="flex w-full flex-1 flex-col relative max-w-7xl mx-auto">` |

### 3. `components/layout/mobile-nav.tsx` (Tertiary Fix — Low Priority)

**Line 37:** Consider adjusting `left-4` to ensure the drawer has a visible buffer from the viewport edge on very small screens (< 375px).

| | Before | After |
|---|---|---|
| Line 37 | `className="w-80 max-w-80 p-0 left-4 translate-x-0"` | `className="w-80 max-w-[90vw] p-0 left-4 translate-x-0"` |

Change is optional — `max-w-80` = 320px which is fine at 375px viewport, but `max-w-[90vw]` is safer for screens < 360px.

---

## CSS Changes (Before/After)

### Shell Component (`components/layout/shell.tsx`)

**Before:**
```tsx
<div className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-0", className)} {...props}>
```

**After:**
```tsx
<div className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 lg:px-0 mx-auto w-full max-w-7xl", className)} {...props}>
```

### Dashboard Layout Main (`app/dashboard/layout.tsx`)

**Before:**
```tsx
<main className="flex w-full flex-1 flex-col relative">
```

**After:**
```tsx
<main className="flex w-full flex-1 flex-col relative max-w-7xl mx-auto">
```

---

## Verification Plan

### 1. Mobile Viewport Test (375px × 667px)
- [ ] Open Dashboard page at 375px width
- [ ] Open Activities page at 375px width
- [ ] Confirm content is centered with equal left/right margins
- [ ] Confirm no horizontal scrollbar appears
- [ ] Confirm hamburger menu is visible and accessible (top-20 left-4)
- [ ] Confirm Shell content does not extend under the hamburger menu

### 2. Tablet Viewport Test (768px × 1024px)
- [ ] Dashboard and Activities pages at 768px width
- [ ] Confirm 200px sidebar is visible on left
- [ ] Confirm content is centered in remaining ~568px column
- [ ] Confirm horizontal overflow is absent

### 3. Desktop Viewport Test (1280px+)
- [ ] Confirm content max-width is capped at 1280px and centered
- [ ] Confirm left sidebar + content layout is correct

### 4. Regression Check
- [ ] Confirm Shell's `grid` layout still works (items-start alignment)
- [ ] Confirm gap spacing unchanged (`gap-4 sm:gap-6 md:gap-8`)
- [ ] Confirm touch targets remain accessible on mobile (min 44×44px)

### 5. Components to Check After Fix
- `DashboardHeader` — `px-2` padding inside Shell is fine
- `DashboardCardsEnhanced` — confirm cards don't overflow
- `DataTable` — confirm table scrolls horizontally if needed (instead of causing page overflow)
- `ActivityList` — confirm list items respect container width

---

## Constraints

- Do not change the `grid` layout behavior of Shell
- Do not remove existing `gap-*` spacing
- Maintain `px-4` on mobile (16px is standard/safe for touch)
- `max-w-7xl` = 1280px is the standard Tailwind max-width for content containers
- Do not modify child component padding unless those components themselves have overflow issues
