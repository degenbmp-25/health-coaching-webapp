# Habithletics Workout App - Alpha-Evolve SPEC.md

## Overview

The Habithletics workout webapp is a mobile-first workout tracking application that fetches workout data from a Google Sheet (published as CSV) and allows clients to log their progress. This spec covers improvements to fix production deployment failures, add proper error handling, loading states, code cleanup, and basic authentication.

---

## 1. Functionality Specification

### 1.1 Core Features

| Feature | Description |
|---------|-------------|
| **Workout Display** | Fetch and display workouts A-E from Google Sheets CSV, organized by category (Movement Prep, Resistance, etc.) |
| **Exercise Logging** | Log weight/reps for each set of each exercise |
| **Progress Tracking** | Track completion status per exercise, overall progress percentage |
| **Workout Selection** | Switch between Workout A-E via tab selector |
| **localStorage Persistence** | Save workout logs to localStorage for client-side persistence |

### 1.2 New Features (This Iteration)

| Feature | Description |
|---------|-------------|
| **Error Handling UI** | User-friendly error messages when data fetching fails, with retry option |
| **Loading Skeletons** | Animated skeleton placeholders matching the workout card layout |
| **Basic Authentication** | Simple client-specific password access (per-client access control) |
| **Auth Session** | Remember authenticated clients via localStorage token |

### 1.3 User Flows

**Authenticated User Flow:**
1. User visits app URL → Auth screen (password input)
2. Enters valid client password → Redirected to workout app
3. App loads workouts from Google Sheets → Shows skeleton → Renders workouts
4. User selects workout, logs weight/reps, marks complete → Data persisted to localStorage

**Error Flow:**
1. App attempts to fetch from Google Sheets
2. Fetch fails (network, CORS, malformed data) → Show error card with message + retry button
3. User clicks retry → Attempt fetch again

---

## 2. Technical Approach

### 2.1 Requirement: Fix App Loading Issue (Production Deployment Failed)

**Root Cause:**  
`lib/sheets.ts` contains duplicate TypeScript interface definitions. The file defines `Exercise` and `Workout` interfaces properly at the top, then at the bottom (after `getLogForExercise()`) there are completely different `Exercise` and `Workout` interface definitions plus mock data. This causes TypeScript compilation errors because:
- `Exercise` is declared twice with incompatible structures
- `Workout` is declared twice with incompatible structures
- The mock data export conflicts with actual data structures

**Fix:**
1. Remove the duplicate interface definitions and mock data from the end of `lib/sheets.ts` (lines ~150-172)
2. Verify TypeScript compilation succeeds with `npm run build`

### 2.2 Requirement: Add Proper Error Handling with User-Friendly Messages

**Current State:**
- Only `console.error('Failed to load workouts:', e)` in `app/page.tsx`
- No UI feedback for user

**Implementation:**
1. Add `error` state to `app/page.tsx`:
   ```typescript
   const [error, setError] = useState<{message: string; retry: () => void} | null>(null);
   ```

2. Create `app/components/ErrorCard.tsx`:
   - Props: `message: string`, `onRetry: () => void`
   - UI: Card with error icon, message text, "Try Again" button
   - Styling: Matches app's dark theme (bg-secondary, red accent for error)

3. Update `useEffect` in `page.tsx`:
   ```typescript
   } catch (e) {
     setError({
       message: 'Unable to load workouts. Please check your connection.',
       retry: load
     });
   }
   ```

4. Display `<ErrorCard />` when `error` is not null, replacing loading state

### 2.3 Requirement: Add Loading Skeleton/Suspense States

**Current State:**
- Simple "Loading workouts..." text in centered div

**Implementation:**
1. Create `app/components/WorkoutSkeleton.tsx`:
   - Animated pulse effect (CSS animation)
   - Skeleton structure matching actual workout card:
     - Header skeleton (title + progress bar shape)
     - Exercise card skeleton (3-4 of them)
     - Each card has: title bar, sets rows, button shape
   - Use `animate-pulse` class with app's CSS variables

2. Add skeleton styles to `app/globals.css`:
   ```css
   .skeleton {
     background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--border) 50%, var(--bg-secondary) 75%);
     background-size: 200% 100%;
     animation: shimmer 1.5s infinite;
     border-radius: 8px;
   }
   
   @keyframes shimmer {
     0% { background-position: 200% 0; }
     100% { background-position: -200% 0; }
   }
   ```

3. Replace loading text with `<WorkoutSkeleton />` in `page.tsx`

### 2.4 Requirement: Clean Up Duplicate Code (Mock Data Conflict in sheets.ts)

**Current State:**
`lib/sheets.ts` contains at the bottom (~20 lines):
- Duplicate `interface Exercise` (different shape)
- Duplicate `interface Workout` (different shape)
- `mockWorkout` constant export
- These are dead code that causes TypeScript errors

**Fix:**
1. Remove lines ~150-172 from `lib/sheets.ts` (the mock data section after `getLogForExercise()`)
2. The file should end with the `getLogForExercise` function

**Verification:**
- Run `npx tsc --noEmit` to verify no type errors
- Run `npm run build` to verify production build succeeds

### 2.5 Requirement: Add Basic Authentication (Per-Client Access)

**Current State:**
- No authentication - anyone with URL can access

**Design Decision:** Use simple password-based authentication (no OAuth/NextAuth complexity for v1)

**Implementation:**

1. Create `app/auth/page.tsx`:
   - Password input form
   - Client-side validation against a config of valid passwords
   - On success: store auth token in localStorage, redirect to main app
   - Styled consistently with app theme

2. Create `lib/auth.ts`:
   ```typescript
   const AUTH_KEY = 'habithletics_auth';
   const CLIENT_PASSWORDS = {
     'client1': 'password123',
     'client2': 'differentpass',
     // Add clients here
   };
   
   export function authenticate(password: string): boolean {
     const valid = Object.values(CLIENT_PASSWORDS).includes(password);
     if (valid) {
       localStorage.setItem(AUTH_KEY, 'authenticated');
     }
     return valid;
   }
   
   export function isAuthenticated(): boolean {
     return localStorage.getItem(AUTH_KEY) === 'authenticated';
   }
   
   export function logout(): void {
     localStorage.removeItem(AUTH_KEY);
   }
   ```

3. Create `app/components/AuthGuard.tsx`:
   - Wrapper component that checks authentication
   - If not authenticated, redirects to `/auth`
   - Uses `useEffect` to avoid SSR issues

4. Wrap main app content in `AuthGuard`:
   - Modify `page.tsx` to check auth before rendering workout content
   - Or create a layout that checks auth at the route level

5. Create `app/auth/page.tsx` (login page):
   - Simple centered card with password input
   - "Access Your Workout" heading
   - Password input + Submit button
   - Error message on invalid password

---

## 3. File Structure

```
habithletics-evolve/
├── app/
│   ├── page.tsx                    # [MODIFY] Add error state, skeleton, auth check
│   ├── layout.tsx                  # [NO CHANGE]
│   ├── globals.css                # [MODIFY] Add skeleton animation styles
│   ├── auth/
│   │   └── page.tsx               # [NEW] Password login page
│   └── components/
│       ├── ErrorCard.tsx          # [NEW] Error display component
│       ├── WorkoutSkeleton.tsx    # [NEW] Loading skeleton
│       └── AuthGuard.tsx          # [NEW] Auth protection wrapper
├── lib/
│   ├── sheets.ts                  # [MODIFY] Remove duplicate mock data (~lines 150-172)
│   ├── data.ts                    # [NO CHANGE] (empty or minimal)
│   └── auth.ts                    # [NEW] Auth utilities
├── ALPHA-EVOLVE/
│   └── SPEC.md                    # [THIS FILE]
├── package.json                   # [NO CHANGE] (no new deps needed)
└── tsconfig.json                  # [NO CHANGE]
```

### New Files Summary

| File | Purpose |
|------|---------|
| `app/auth/page.tsx` | Login page with password form |
| `app/components/ErrorCard.tsx` | User-friendly error display with retry |
| `app/components/WorkoutSkeleton.tsx` | Animated loading placeholder |
| `app/components/AuthGuard.tsx` | HOC/wrapper for auth protection |
| `lib/auth.ts` | Auth token management utilities |

### Modified Files Summary

| File | Change |
|------|--------|
| `app/page.tsx` | Add error state, use skeleton/error components, wrap with AuthGuard |
| `app/globals.css` | Add `.skeleton` CSS animation |
| `lib/sheets.ts` | Remove duplicate interfaces and mock data (lines ~150-172) |

---

## 4. Dependencies

**No new npm packages required.** The app uses:
- Next.js 14 (already installed)
- React 18 (already installed)
- TypeScript (already installed)

All auth, error handling, and skeleton functionality can be implemented with:
- React hooks (`useState`, `useEffect`)
- CSS animations (no external library)
- localStorage for auth token

---

## 5. Migration Plan

### Phase 1: Code Cleanup (Low Risk)
1. Remove duplicate mock data from `lib/sheets.ts` (lines ~150-172)
2. Run `npm run build` to verify fix
3. **Breakpoint:** Production build succeeds

### Phase 2: Error Handling & Skeletons (UI Only)
1. Create `ErrorCard.tsx` component
2. Create `WorkoutSkeleton.tsx` component
3. Add skeleton CSS to `globals.css`
4. Update `page.tsx` to use error/skeleton states
5. Test locally with `npm run dev`
6. **Breakpoint:** Loading shows skeleton, errors show friendly message

### Phase 3: Authentication (Requires Config)
1. Create `lib/auth.ts` with password config
2. Create `app/auth/page.tsx` login page
3. Create `AuthGuard.tsx` component
4. Update `page.tsx` to wrap with AuthGuard
5. Add client passwords to `lib/auth.ts`
6. **Breakpoint:** Unauthenticated users see login page

### Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Auth required | Existing users must enter password | Provide password to existing clients |
| `lib/sheets.ts` cleanup | Removes unused exports | Verify no other files import mock data |

### Rollback Plan

If issues arise:
1. Revert `lib/sheets.ts` to include mock data (easy revert)
2. Remove auth components (straightforward deletion)
3. Revert `page.tsx` to simple loading text (minor change)

---

## 6. Assumptions & Notes

1. **Auth Passwords:** Stored in `lib/auth.ts` as a simple object. For production, recommend environment variables or a secure config. This is "basic" auth - acceptable for internal/client tools, not for high-security apps.

2. **Single Shared Password per Client:** Each client gets one password. Not per-user within a client org. Upgrade path: replace with NextAuth + OAuth if needed.

3. **Google Sheets CSV URL:** The CSV URL is hardcoded in `lib/sheets.ts`. In production, consider moving to environment variable `NEXT_PUBLIC_SHEET_CSV_URL`.

4. **localStorage Auth Token:** Uses simple string `'authenticated'`. Not a JWT or secure token. Acceptable for low-security internal tool.

5. **No Server-Side Auth:** All auth is client-side. A savvy user could bypass by modifying localStorage. For proper security, auth should be validated server-side (e.g., NextAuth.js middleware).

6. **Error Messages:** English only. No i18n. Messages are friendly but not configurable.

---

## 7. Success Criteria

- [ ] `npm run build` completes without errors
- [ ] App shows skeleton while loading workouts
- [ ] App shows friendly error + retry button on fetch failure
- [ ] Unauthenticated users redirected to `/auth`
- [ ] Authenticated users see workout app
- [ ] No TypeScript errors (`npx tsc --noEmit` passes)
- [ ] All 5 requirements from `requirements.md` addressed
