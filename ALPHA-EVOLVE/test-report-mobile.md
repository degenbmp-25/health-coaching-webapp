# Mobile Centering Test Report - Habithletics App

**Date:** Tue 2026-04-07  
**Viewport:** 375px width (mobile)  
**Tester:** Subagent (Tester Agent)  
**URLs Tested:**
- Dashboard: https://habithletics-redesign-evolve-coral.vercel.app/dashboard
- Activities: https://habithletics-redesign-evolve-coral.vercel.app/dashboard/activities

---

## Summary

| Page | Centered? | Issue |
|------|-----------|-------|
| Dashboard | **NO** | Content pushed right by sidebar |
| Activities | **NO** | Content pushed right by sidebar |

---

## Dashboard Analysis

### Screenshot
![Dashboard Mobile](dashboard-mobile.png)

### Findings
- **Centered:** ❌ NO
- **Left Margin:** ~64px (sidebar width)
- **Right Margin:** ~16-20px
- **Horizontal Overflow:** None detected

### Issue Description
The main content area (Quick Log Activities, Active Goals) is **NOT horizontally centered**. The sidebar occupies approximately 64px on the left side of the screen. The main content starts immediately after the sidebar and extends to the right edge, resulting in:
- Left margin: ~64px (sidebar)
- Right margin: ~16-20px

This creates an **asymmetrical layout** where content is visibly pushed to the right side of the viewport rather than being centered within the available space.

---

## Activities Page Analysis

### Screenshot
![Activities Mobile](activities-mobile.png)

### Findings
- **Centered:** ❌ NO
- **Left Margin:** ~64px (sidebar width)  
- **Right Margin:** ~16-20px
- **Horizontal Overflow:** None detected

### Issue Description
Same issue as Dashboard. The sidebar on the left occupies ~64px, and the main content (Activities list) starts after it. The content is pushed to the right rather than being centered within the remaining viewport width.

---

## Specific Observations

### What's Wrong
1. **Left-heavy layout** - Sidebar takes fixed 64px on left, content starts after it
2. **Asymmetrical margins** - Left margin (~64px) is 3-4x larger than right margin (~16px)
3. **Content not centered** - Main content boxes (Quick Log Activities, Active Goals) should be centered within the available viewport space

### What Should Happen
On mobile at 375px width:
- If sidebar is 64px, remaining space = 375 - 64 = 311px
- Main content should be centered within those 311px
- Or: sidebar should collapse on mobile, allowing content to use full 375px width

### Note
The secondary menu (hamburger icon) on the left is **INTENTIONAL** and not flagged as an issue. However, its presence IS causing the content misalignment - the sidebar physically occupies space that should be available for centering.

---

## Recommendation
The main content area needs to be centered within the available viewport space. Possible fixes:
1. Center the content within the remaining space after the sidebar
2. Collapse the sidebar on mobile (use hamburger menu only)
3. Add proper mobile-responsive centering (margin: 0 auto or flexbox centering)

---

## Files
- Dashboard screenshot: `dashboard-mobile.png`
- Activities screenshot: `activities-mobile.png`
