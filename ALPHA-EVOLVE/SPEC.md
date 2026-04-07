# SPEC.md - Mobile Centering Fix

## Problem Summary
Dashboard page has ~200px of empty space on the LEFT on mobile (375px), content is pushed RIGHT, right edge flush with screen.

## Root Cause Analysis

After examining the code, I've identified **TWO root causes**:

### Root Cause #1: Flex Container with Hidden Absolute Child (Primary)

```jsx
// CURRENT (BROKEN)
<div className="relative flex flex-1">
  <aside className="absolute left-0 top-0 hidden lg:block w-[200px] h-full">
    <DashboardNav items={dashboardLinks.data} />
  </aside>
  <main className="flex w-full flex-1 flex-col relative">
```

**The problem:** The parent `<div className="relative flex flex-1">` is a **flex container**. Even though `<aside>` has `hidden lg:block`, the combination of:
1. `flex flex-1` on the parent
2. `w-full flex-1` on `<main>`
3. `absolute` positioning on the sidebar

...can cause unexpected behavior where the flex child (`main`) doesn't expand to full width on mobile because the flex container's **intrinsic sizing** is still accounting for the sidebar's declared width (`w-[200px]`).

**On mobile:** The `aside` IS `display: none` (from `hidden`), but the flex container may have already computed its size based on the sidebar's explicit width before the `hidden` class takes effect.

### Root Cause #2: Tailwind's `hidden lg:block` May Have Specificity Issues

Tailwind's `hidden` class (`display: none !important`) should override everything. However, in some Next.js/React builds with SSR and hydration, there can be a flash where the sidebar is briefly visible, and the flex container has already computed its layout.

### Why CSS Approaches Failed

| Approach | Why It Failed |
|----------|---------------|
| `hidden md:flex` | Same flex container issue |
| `hidden md:block` | Same flex container issue |
| `flex flex-col md:flex-row` | Column on mobile still has flex child with explicit width |
| `absolute` positioning | Already using this, but parent flex container is the problem |

## Solution

The fix is to **remove the sidebar from the flex parent's space calculation entirely on mobile** by making it a true overlay on desktop and completely outside the flex flow on mobile.

### Changes to `app/dashboard/layout.tsx`

**Before:**
```tsx
<div className="flex min-h-screen flex-col space-y-6 px-4">
  <Navbar />
  <div className="relative flex flex-1">
    <aside className="absolute left-0 top-0 hidden lg:block w-[200px] h-full">
      <DashboardNav items={dashboardLinks.data} />
    </aside>
    <main className="flex w-full flex-1 flex-col relative">
      <div className="fixed top-20 left-4 z-50 lg:hidden">
        <MobileNav items={mobileLinks} />
      </div>
      <div className="lg:pl-[216px] px-4">
        {children}
      </div>
    </main>
  </div>
  <Footer />
</div>
```

**After:**
```tsx
<div className="flex min-h-screen flex-col space-y-6 px-4">
  <Navbar />
  
  {/* DESKTOP ONLY: Fixed sidebar that overlays content */}
  <aside className="fixed left-0 top-16 bottom-0 w-[200px] z-30 hidden lg:block">
    <DashboardNav items={dashboardLinks.data} />
  </aside>
  
  {/* Main content: full width on mobile, with left indent on desktop */}
  <main className="flex w-full flex-1 flex-col relative">
    {/* Mobile hamburger nav - positioned to NOT affect content flow */}
    <div className="fixed top-20 left-4 z-50 lg:hidden">
      <MobileNav items={mobileLinks} />
    </div>
    
    {/* Content: px-4 on mobile (16px padding), lg:pl-[216px] on desktop (sidebar width + buffer) */}
    <div className="px-4 lg:pl-[216px] w-full">
      {children}
    </div>
  </main>
  
  <Footer />
</div>
```

### Key Changes Explained

1. **Sidebar moved OUTSIDE the flex container** - It's no longer a flex child at all
2. **Sidebar is `fixed` (not `absolute`) on desktop** - `fixed` anchors it to the viewport, `top-16` accounts for navbar height
3. **Sidebar is `hidden lg:block`** - Hidden on mobile, fixed overlay on desktop
4. **Removed `relative flex flex-1` wrapper around sidebar+main** - The flex parent was causing the space issue
5. **Main content uses `px-4` on ALL screen sizes** - No conditional padding; desktop indent comes from sidebar being fixed overlay
6. **Sidebar removed from document flow on desktop via `fixed`** - Content goes behind it, hence `lg:pl-[216px]`

## Files to Change

| File | Change |
|------|--------|
| `app/dashboard/layout.tsx` | Rewrite layout structure as per above |

## Alternative Quick Fix (If Above Doesn't Work)

If the above still has issues, try this even simpler approach:

```tsx
<div className="flex min-h-screen flex-col space-y-6">
  <Navbar />
  
  {/* Mobile: no sidebar space. Desktop: sidebar fixed, content below nav, indented */}
  <div className="flex flex-1 flex-col lg:flex-row">
    {/* Mobile nav - only visible on mobile */}
    <div className="fixed top-20 left-4 z-50 lg:hidden">
      <MobileNav items={mobileLinks} />
    </div>
    
    {/* Content - always full width on mobile, indented on desktop */}
    <main className="flex-1 px-4 lg:pl-[216px]">
      {children}
    </main>
  </div>
  
  <Footer />
</div>
```

With sidebar hidden on mobile via `hidden lg:flex`:
```tsx
<aside className="hidden lg:flex w-[200px] flex-col">
  <DashboardNav items={dashboardLinks.data} />
</aside>
```

## Verification Steps

1. **Mobile (375px viewport)**
   - Open browser dev tools at 375px width
   - Inspect the main element - it should have `width: 100%` with `padding-left: 16px` and `padding-right: 16px`
   - The sidebar `<aside>` should have `display: none`
   - Verify no ghost space on left - content starts at x=0 + 16px padding
   - Test hamburger menu opens correctly

2. **Desktop (1024px+ viewport)**
   - Sidebar should appear on left, fixed position
   - Content should start at x=216px (200px sidebar + 16px buffer)
   - No overlap between sidebar and content

3. **Test on actual mobile**
   - Deploy to Vercel
   - Open on phone at https://habithletics-redesign-evolve-coral.vercel.app/dashboard
   - Verify content is full width and left-aligned

## CSS Classes Reference

| Class | Effect |
|-------|--------|
| `fixed` | Position relative to viewport |
| `hidden lg:block` | Hide on mobile, show on desktop |
| `hidden lg:flex` | Hide on mobile, flex on desktop |
| `lg:pl-[216px]` | Left padding 216px only on large screens |
| `px-4` | Padding 16px on all sides |
| `flex-1` | Grow to fill available space |

## Why This Fix Will Work

1. **Sidebar completely removed from flex flow** - No longer a child of any flex container
2. **Fixed positioning on desktop** - Overlays content, doesn't affect content width
3. **Main content is always full-width container** - On mobile: `flex-1 px-4`. On desktop: `flex-1 px-4 lg:pl-[216px]`
4. **No more ghost space** - The sidebar's 200px width never affects the mobile layout because it's `hidden` AND `fixed` (not in flow)

## Implementation Note

The trainer layout uses a different approach (`grid flex-1 gap-4 md:grid-cols-[200px_1fr]`) which works correctly. The dashboard layout tried to use `absolute` positioning to achieve a similar effect but introduced the flex container bug.
