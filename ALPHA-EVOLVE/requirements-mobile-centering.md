# Mobile Centering Fix - Requirements

## Problem
Dashboard and Activities pages are off-center on mobile viewports.

## Target
- app/dashboard/page.tsx (Dashboard)
- app/dashboard/activities/page.tsx (Activities)

## Success Criteria
1. All content containers must be centered with equal margins on left/right
2. No horizontal overflow or scroll
3. Content should not be cut off on smaller devices
4. Touch targets remain accessible

## Scope
- Check CSS for container sizing
- Check for overflow-x issues
- Verify responsive breakpoints
- Ensure consistent padding/margins

## Output
- Commit fixes to fix/mobile-centering branch
- Deploy and verify on mobile viewport
