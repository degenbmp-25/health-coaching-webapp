# Alpha-Evolve Requirements — Habithletics Redesign Workout Page

## Context

This is a health coaching webapp with:
- Dashboard-based navigation (dashboard/workouts is the workout page)
- shadcn/ui design system with Tailwind CSS variables
- Dark/light mode support
- Server Components with client component islands
- Prisma database with user authentication

**Design System:**
- Tailwind with CSS variables (--primary, --secondary, --muted, etc.)
- Border radius: var(--radius) = 0.5rem
- Dark mode uses orange/red primary: --primary: 0 72.2% 50.6%
- Light mode uses dark gray primary: --primary: 240 5.9% 10%
- Components use shadcn/ui (Card, Badge, Button, etc.)

## Previous Accomplishments (from habithletics-evolve loop)

We previously ran Alpha-Evolve on a similar codebase and fixed:
1. **Set iteration bug** — workout-item.tsx line 24: `...new Set(...)` needs `Array.from()` or `--downlevelIteration` flag
2. **Loading skeleton** — WorkoutSkeleton.tsx component with pulsing animation
3. **Error handling** — ErrorCard.tsx for failed data fetches with retry button
4. **Auth consistency** — Cookie-based auth that middleware checks

## End Goal

A production-ready workout page that:
1. **Builds without errors**
2. **Matches the rest of the app's design** (color scheme, fonts, spacing, component styles)
3. **Has proper loading states** (skeleton components while data loads)
4. **Has error handling** (graceful error display with retry)
5. **Uses consistent design tokens** (CSS variables, spacing scale, typography)

## Requirements

### 1. Fix Build Errors
- [ ] Fix `Set<string>` iteration TypeScript error in workout-item.tsx
- [ ] Ensure all imports resolve correctly
- [ ] Verify build passes: `npm run build`

### 2. Design Consistency
- [ ] Workout page must use same color scheme as dashboard (CSS variables)
- [ ] Typography must match (font sizes, weights from design system)
- [ ] Spacing must be consistent (use Tailwind's spacing scale)
- [ ] Cards/components must match app's rounded corners, shadows, borders
- [ ] Dark mode must work seamlessly with rest of app

### 3. Loading States
- [ ] Skeleton loader for workout list (matches card style of app)
- [ ] Skeleton loader for individual workout items
- [ ] Smooth transition from skeleton to content
- [ ] Skeleton uses app's muted color CSS variable

### 4. Error Handling
- [ ] Error state for failed workout fetch
- [ ] Error card with retry button
- [ ] Error styling matches app's destructive color scheme
- [ ] Empty state for no workouts (already exists, verify it matches)

### 5. Auth Flow (verify)
- [ ] Redirect to signin when unauthenticated (already in code)
- [ ] Server-side protection via middleware
- [ ] Loading state while auth check completes

## Technical Constraints

- Do NOT change the database schema
- Do NOT change the Prisma client usage
- Keep server components as server components
- Use existing shadcn/ui components where possible
- Match the app's existing patterns for consistency

## Success Criteria

1. `npm run build` passes with zero errors
2. Workout page visually matches rest of dashboard
3. Loading skeletons appear and match card style
4. Error handling works with retry capability
5. Dark/light mode works correctly
