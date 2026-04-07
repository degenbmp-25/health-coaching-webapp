# Requirements - Mobile Centering Fix

## Problem
The dashboard and activities pages are off-center on MOBILE (375px viewport). Content is pushed to the RIGHT with a large empty space on the LEFT where the sidebar would be. The right edge is flush with the screen.

## Current Behavior (BROKEN)
- Mobile: Large empty space on left (sidebar ghost), content pushed to right
- Desktop: Works correctly with sidebar + content side-by-side

## Desired Behavior
- **Mobile (all viewports <1024px)**: 
  - NO sidebar taking up any space
  - Content should be FULL WIDTH
  - Content should be LEFT-ALIGNED starting from the left edge
  - Hamburger menu should appear for navigation
- **Desktop (≥1024px)**:
  - Sidebar visible on left
  - Content indented to the right of sidebar
  - Full sidebar navigation

## Constraints
- DEADLINE: 3 hours
- Must work on actual mobile browsers
- Must not break desktop layout
- Currently using Next.js App Router
- Current branch: fix/mobile-centering
- Deployment: https://habithletics-redesign-evolve-coral.vercel.app

## Technical Context
- Tried: `hidden md:flex` - sidebar still ghosting
- Tried: `hidden md:block` - sidebar still ghosting  
- Tried: `flex flex-col md:flex-row` - sidebar still ghosting
- Tried: `absolute` positioning - still off-center

The issue is persistent - the sidebar or some ghost element is taking up ~200px of space on mobile even when "hidden".

## Success Criteria
1. On mobile (375px): Content is FULL WIDTH, left-aligned, no empty sidebar space
2. On desktop: Sidebar + content work correctly
3. Hamburger menu works on mobile for navigation
4. All pages using this layout must be centered properly

## Scope
Files to examine:
- app/dashboard/layout.tsx (main layout)
- app/activities/layout.tsx (if separate)
- components/layout/shell.tsx
- Any shared layout components
- globals.css (may have container or centering styles)
