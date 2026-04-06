# SPEC.md - Trainer Tab Navigation Fix

## Problem Statement

The trainer sidebar navigation is missing links to the Videos and Sheets pages. The trainer section should display all four pages:
- Programs (`/trainer/programs`)
- Clients (`/trainer/clients`)
- Videos (`/trainer/videos`)
- Sheets (`/trainer/sheets`)

## Current State Analysis

| Component | Status |
|-----------|--------|
| `config/links.ts` - `trainerLinks` | Only has Programs and Clients |
| `app/trainer/` directory | Has pages for all 4 routes: programs, clients, videos, sheets |
| `app/dashboard/layout.tsx` | Access control correctly checks owner/trainer/coach roles |
| Mobile navigation | Correctly merges trainer links when user has access |
| Sidebar rendering | Conditionally shows trainer section based on `canAccessTrainer` |

**Root Cause:** `trainerLinks` in `config/links.ts` is missing the Videos and Sheets entries.

## Solution

Update `config/links.ts` to include all trainer pages in `trainerLinks`.

### Changes Required

**File: `config/links.ts`**

Update `trainerLinks` to include all 4 trainer pages:

```typescript
export const trainerLinks: Navigation = {
  data: [
    {
      title: "Programs",
      href: "/trainer/programs",
      icon: "target",
    },
    {
      title: "Clients",
      href: "/trainer/clients",
      icon: "user",
    },
    {
      title: "Videos",
      href: "/trainer/videos",
      icon: "video",
    },
    {
      title: "Sheets",
      href: "/trainer/sheets",
      icon: "sheet", // or appropriate icon
    },
  ],
} as const
```

### Architecture Notes

- **Access Control:** Already implemented in `app/dashboard/layout.tsx` - no changes needed
- **Mobile Navigation:** Already implemented - trainer links passed when `canAccessTrainer` is true
- **Persistence:** Links are hardcoded in config, so they persist across sessions naturally

## Files to Modify

| File | Change |
|------|--------|
| `config/links.ts` | Add Videos and Sheets to `trainerLinks.data` array |

## Verification Checklist

- [ ] Sidebar shows "Programs", "Clients", "Videos", "Sheets" for trainer/coach/owner users
- [ ] Sidebar hides trainer section for regular users
- [ ] Mobile nav includes all trainer links when user has access
- [ ] All 4 trainer routes are accessible: `/trainer/programs`, `/trainer/clients`, `/trainer/videos`, `/trainer/sheets`