# Architect A Report - Layout/CSS Analysis

## Root Cause Identified

The mobile centering issue stems from a **double-wrapping problem** in the Dashboard layout hierarchy combined with an **overflow containment conflict**.

### The Problem Chain:

1. **Dashboard Layout** (`app/dashboard/layout.tsx`) wraps content in:
   ```tsx
   <div className="container grid flex-1 gap-4 md:gap-12 md:grid-cols-[200px_1fr]">
   ```
   - This creates a CSS grid container on the OUTSIDE
   - The `<main>` element is inside this grid

2. **Dashboard Page** (`app/dashboard/page.tsx`) wraps content in:
   ```tsx
   <Shell className="pt-20 md:pt-0">
   ```
   - Shell has: `mx-auto w-full max-w-7xl` (self-centering)
   - Shell also has: `px-4 sm:px-6 lg:px-0`

3. **The Conflict:**
   - The `.container` CSS class (globals.css line ~91-96) applies:
     ```css
     .container {
       @apply mx-auto px-4 sm:px-6 lg:px-8;
       max-width: 100%;
     }
     ```
   - BUT the Tailwind config's `.container` variant is ALSO set to `center: true` (tailwind.config.js line 11)
   - On mobile, the outer `<div className="container">` from the layout applies `.container` centering
   - But inside, the Shell also applies `mx-auto` centering
   - **The real issue**: The outer container div creates the grid context, and the Sidebar `<aside>` with `hidden w-[200px]` creates a 200px fixed width that exists in the document even when hidden on mobile, potentially contributing to layout calculation issues.

4. **Key Difference Between Working vs Broken:**
   - `/trainer/programs` - Uses `<Shell>` directly with no outer grid conflict
   - `/trainer/programs/[id]` - Uses `<Shell>` with same structure but content is simpler (fewer nested components)
   - `/dashboard` - Has MORE nested interactive components (HabitLoggingPanel, TodaysActivities, StreakOverview) that may have overflow issues

### Most Likely Culprit - The Heatmap:

In `components/charts/heatmap.tsx` (line 120-122):
```tsx
<Card className="w-full overflow-x-auto p-4 md:p-8">
  <div className="min-w-[765px]">
```

The Heatmap card has `overflow-x-auto` which allows horizontal scroll, AND it contains a div with `min-w-[765px]`. On mobile, this element can force horizontal scroll behavior that affects the perceived centering of the entire page.

### Secondary Issue - DashboardHeader:

In `components/pages/dashboard/dashboard-header.tsx` (line 13):
```tsx
<div className="flex flex-col items-center justify-between gap-4 px-2 text-center md:flex-row md:text-left">
```

The `items-center` class combined with the grid layout may be causing centering on mobile for child elements.

## Evidence

### File Comparison:

| Aspect | dashboard/layout.tsx | trainer/layout.tsx |
|--------|---------------------|-------------------|
| Outer div | `container grid...` | `container grid...` | ✓ SAME |
| Grid cols | `md:grid-cols-[200px_1fr]` | `md:grid-cols-[200px_1fr]` | ✓ SAME |
| Aside width | `w-[200px]` | `w-[200px]` | ✓ SAME |
| Main element | `flex w-full flex-1 flex-col` | `flex w-full flex-1 flex-col` | ✓ SAME |
| Shell wrapper | Used inside main | Used inside main | ✓ SAME |

**Conclusion:** Layout files are functionally identical. Issue is not in the layout structure itself.

### Shell Component (`components/layout/shell.tsx`):
```tsx
<div className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 lg:px-0 mx-auto w-full max-w-7xl", className)}
```
- Has `mx-auto` (centers itself)
- Has `w-full` (fills available width up to max-w-7xl)
- Has explicit `px-4 sm:px-6 lg:px-0` padding

### globals.css (.container):
```css
.container {
  @apply mx-auto px-4 sm:px-6 lg:px-8;
  max-width: 100%;
}
```
- Applies horizontal centering via `mx-auto`
- Has responsive padding

### tailwind.config.js:
```js
container: {
  center: true,  // This enables .container centering
  padding: "2rem",
  screens: { "2xl": "1400px" },
},
```

## Recommended Fix

### Primary Fix - Remove Overflow from Heatmap:

**File:** `components/charts/heatmap.tsx`
**Line:** 120-121

**Change from:**
```tsx
<Card className="w-full overflow-x-auto p-4 md:p-8">
  <div className="min-w-[765px]">
```

**Change to:**
```tsx
<Card className="w-full overflow-x-auto p-4 md:p-8">
  <div className="min-w-[765px] w-full">
```

OR alternatively, constrain the min-width on mobile:
```tsx
<div className="min-w-[765px] max-w-full">
```

### Secondary Fix - Ensure Shell Has Proper Mobile Width Constraint:

**File:** `components/layout/shell.tsx`
**Line:** 9

**Current:**
```tsx
<div className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 lg:px-0 mx-auto w-full max-w-7xl", className)}
```

**Change to:**
```tsx
<div className={cn("grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 lg:px-0 mx-auto w-full max-w-7xl min-w-0", className)}
```

**Reason:** Adding `min-w-0` ensures the grid item can shrink below its content's minimum width, preventing overflow.

### Tertiary Fix - DashboardHeader Mobile Centering:

**File:** `components/pages/dashboard/dashboard-header.tsx`
**Line:** 13

**Current:**
```tsx
<div className="flex flex-col items-center justify-between gap-4 px-2 text-center md:flex-row md:text-left">
```

**Change to:**
```tsx
<div className="flex flex-col items-stretch justify-between gap-4 px-2 text-center md:flex-row md:text-left md:items-center">
```

**Reason:** `items-center` was centering content on mobile. Using `items-stretch` on mobile and `items-center` only at `md:` breakpoint ensures left-alignment on mobile.

### If Issue Persists - Debug Step:

Add this to `app/globals.css` to verify which element is causing overflow:
```css
/* Debug: show elements causing overflow */
debug-scope * {
  outline: 1px solid red;
}
```

Then apply `debug-scope` class temporarily to isolate the problem.

## Summary

The most likely root cause is the **Heatmap component's `min-w-[765px]`** inside an `overflow-x-auto` Card. This forces a minimum width that, when combined with mobile viewport constraints and nested flex/grid contexts, causes horizontal scroll behavior that breaks the visual centering.

Fix priority:
1. Heatmap `min-w` constraint (most likely)
2. Shell `min-w-0` addition (preventive)
3. DashboardHeader alignment (secondary)
