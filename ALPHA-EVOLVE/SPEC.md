# Alpha-Evolve Implementation Plan — Habithletics Workout Page

## Root Cause Analysis

### 1. TypeScript Build Failure
**Location:** `components/workout/workout-item.tsx` line 24

**Problem:**
```typescript
const muscleGroups = [
  ...new Set(workout.exercises.map((we) => we.exercise.muscleGroup).filter(Boolean)),
]
```

**Cause:** The `tsconfig.json` has `"target": "es5"`. ES5 does not support spread syntax on iterables (like `Set`). The spread operator `...` works on arrays in ES5, but `new Set()` returns a `Set` object, not an array. Spread on non-array iterables requires ES6+.

**Fix:** Change line 24 from:
```typescript
...new Set(...)
```
to:
```typescript
...Array.from(new Set(...))
```

### 2. Design Consistency
**Status:** Workout components are mostly consistent with the design system.

**Findings:**
- ✅ Uses `Card` component from shadcn/ui
- ✅ Uses `Badge` with appropriate variants (`secondary`, `outline`)
- ✅ Uses `Button` with `default` variant and `sm` size
- ✅ Uses `text-muted-foreground` for secondary text
- ✅ Uses `Icons.dumbbell` and `Icons.statsBar` from shared icons
- ✅ Card has `rounded-lg` via `className="rounded-lg border bg-card"`
- ⚠️ Card has no explicit shadow — may need `hover:shadow-md` (already added)
- ✅ Dark/light mode works via CSS variables (`--primary`, `--muted`, etc.)

**Missing:**
- No dedicated workout skeleton components
- No error boundary/error card for client-side errors

### 3. Skeleton Components
**Status:** Not implemented

The app has:
- `components/ui/skeleton.tsx` — base skeleton component (`animate-pulse rounded-md bg-muted`)
- `app/dashboard/loading.tsx` — full-page spinner loading state

**Missing:**
- `components/workout/workout-skeleton.tsx` — skeleton for individual workout cards
- `components/workout/workout-list-skeleton.tsx` — skeleton for workout list grid

### 4. Error Handling
**Status:** Not implemented for client-side

The server component (`app/dashboard/workouts/page.tsx`) has:
- Server-side auth redirect to `/signin`
- No try/catch around `getUserWorkouts()`

**Missing:**
- `app/dashboard/workouts/error.tsx` — Next.js error boundary for client-side errors
- `components/ui/error-card.tsx` — reusable error display component

### 5. Auth Flow
**Status:** ✅ Verified

`middleware.ts` protects `/dashboard(.*)` routes:
```typescript
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});
```

---

## Component-by-Component Implementation Plan

### Phase 1: Fix TypeScript Error (Critical)

**File:** `components/workout/workout-item.tsx`

| Line | Current | Change To |
|------|---------|----------|
| 24 | `...new Set(workout.exercises.map((we) => we.exercise.muscleGroup).filter(Boolean))` | `...Array.from(new Set(workout.exercises.map((we) => we.exercise.muscleGroup).filter(Boolean)))` |

### Phase 2: Create Error Card Component

**New File:** `components/ui/error-card.tsx`

```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"

interface ErrorCardProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorCard({ 
  title = "Something went wrong", 
  description = "An error occurred while loading this content.",
  onRetry 
}: ErrorCardProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Icons.warning className="h-5 w-5 text-destructive" />
          <CardTitle className="text-destructive">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            <Icons.spinner className="mr-2 h-4 w-4" />
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### Phase 3: Create Workout Skeleton Components

**New File:** `components/workout/workout-skeleton.tsx`

```typescript
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function WorkoutSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
        
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
      
      <div className="border-t p-3">
        <Button variant="default" size="sm" className="w-full" disabled>
          <Skeleton className="h-4 w-24" />
        </Button>
      </div>
    </Card>
  )
}
```

**New File:** `components/workout/workout-list-skeleton.tsx`

```typescript
import { WorkoutSkeleton } from "./workout-skeleton"

export function WorkoutListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <WorkoutSkeleton key={i} />
      ))}
    </div>
  )
}
```

### Phase 4: Create Client-Side Error Boundary

**New File:** `app/dashboard/workouts/error.tsx`

```typescript
"use client"

import { useEffect } from "react"
import { ErrorCard } from "@/components/ui/error-card"

export default function WorkoutsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Workouts page error:", error)
  }, [error])

  return (
    <div className="grid items-start gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 md:px-0">
      <ErrorCard
        title="Failed to load workouts"
        description="Something went wrong while loading your workouts. Please try again."
        onRetry={reset}
      />
    </div>
  )
}
```

### Phase 5: Add Suspense Boundary to Page

**File:** `app/dashboard/workouts/page.tsx`

**Change:** Wrap `WorkoutList` in Suspense with skeleton fallback.

**Add import:**
```typescript
import { Suspense } from "react"
import { WorkoutListSkeleton } from "@/components/workout/workout-list-skeleton"
```

**Change the WorkoutList rendering:**
```typescript
<Suspense fallback={<WorkoutListSkeleton count={6} />}>
  <WorkoutList workouts={workouts} />
</Suspense>
```

---

## File Changes Summary

| Action | File | Change |
|--------|------|--------|
| **FIX** | `components/workout/workout-item.tsx` | Line 24: `...new Set(...)` → `...Array.from(new Set(...))` |
| **CREATE** | `components/ui/error-card.tsx` | New reusable error card component |
| **CREATE** | `components/workout/workout-skeleton.tsx` | Skeleton for individual workout cards |
| **CREATE** | `components/workout/workout-list-skeleton.tsx` | Skeleton for workout list grid |
| **CREATE** | `app/dashboard/workouts/error.tsx` | Next.js error boundary |
| **MODIFY** | `app/dashboard/workouts/page.tsx` | Add Suspense boundary with skeleton fallback |

---

## CSS/Class Changes for Design Consistency

The workout components are **already consistent** with the design system. No CSS changes required.

**Design tokens in use:**
- `bg-card` / `text-card-foreground` — Card colors
- `border` — Standard border color
- `text-muted-foreground` — Secondary text
- `rounded-lg` — Border radius via Card component
- `shadow-md` — Applied on hover via `hover:shadow-md`
- `text-xs` / `text-sm` / `text-lg` — Typography scale
- `gap-1.5` / `gap-3` / `gap-4` — Spacing scale

---

## Build Verification

After implementing the changes:

1. **TypeScript check:** `npx tsc --noEmit`
2. **Build:** `npm run build`
3. **Verify:**
   - Workout page loads with skeleton while fetching
   - Dark/light mode toggle works
   - Error simulation shows error card with retry
   - No console errors

---

## Dependencies

All new components use existing dependencies:
- `Skeleton` from `components/ui/skeleton`
- `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from `components/ui/card`
- `Button` from `components/ui/button`
- `Icons` from `components/icons`
- `cn` utility from `@/lib/utils`

No new npm packages required.
