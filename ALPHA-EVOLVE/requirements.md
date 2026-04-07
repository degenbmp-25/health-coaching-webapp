# Mobile Centering Fix - Alpha-Evolve Loop

## Target Issue
Dashboard pages are NOT properly centered on mobile. Specifically:
- `/dashboard` - OFF CENTER (content pushed left, big gap on right)
- `/trainer/programs/[id]` - OFF CENTER  
- `/dashboard/activities` - OFF CENTER
- `/dashboard/clients` - OFF CENTER

## Working Pages (Baseline)
These pages ARE centered properly on mobile:
- `/trainer/programs` - centered
- Homepage `/` - centered
- Sign-in `/signin` - centered

## Key Observation
The image analysis shows: "empty space on BOTH left and right sides (~7-8% each), content in the middle (~84-86%)"

This suggests the content IS somewhat centered but may have extra margins or the container is narrower than it should be.

## Root Cause Hypothesis
Dashboard layout uses different structure than trainer layout:
- Dashboard: `flex-col` with `container` inside content div
- Trainer: `grid flex-1 md:grid-cols-[200px_1fr]` as direct child of outer flex

## Requirements
1. Fix mobile centering so content fills the viewport properly
2. Content should be left-aligned with natural `px-4` padding (16px on each side)
3. NO artificial centering that creates symmetric gutters
4. Maintain desktop functionality (sidebar, etc.)
5. Keep auth bypasses in place for demo

## Scope
Files to investigate:
- `app/dashboard/layout.tsx` - main dashboard layout (BROKEN)
- `app/trainer/layout.tsx` - trainer layout (WORKING - use as reference)
- `components/layout/shell.tsx` - shared Shell component
- `app/globals.css` - container class definitions

## Success Criteria
- Mobile viewport (375px): Content fills available width with natural padding
- Content is LEFT-ALIGNED with 16px left padding
- NO centering that creates symmetric gutters
- Desktop (1024px+): Sidebar visible, content properly indented
- No regression on already-working pages

## Note on Current State
We've already tried 4 manual fixes:
1. Added `space-y-6` back to outer div
2. Used `container` class in content wrapper
3. Mirrored trainer layout exactly
4. Currently: Both layouts now use identical structure

The issue may be in:
- Shell component (`max-w-7xl mx-auto w-full`)
- globals.css container class behavior
- Page-level components (not just layout)

This needs deeper investigation - hence 3 architects to find root cause.
