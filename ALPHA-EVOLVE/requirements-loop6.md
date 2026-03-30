# Alpha-Evolve Loop 6 Requirements

## Issue 1: Client "Start Workout" 404 (P0 - Critical)
When a CLIENT (kvnmiller11@gmail.com) clicks "Start" on a workout from their program on iPhone, they still get a 404 error.

### Previous Fix Attempted
The fix in commit 280b40f tried to resolve session ID to workout ID:
```typescript
const session = await db.workoutSession.findFirst({
  where: { id: params.workoutId, userId: user.id },
  select: { workoutId: true },
})
if (session) {
  workoutId = session.workoutId
}
```

### Possible Root Causes
1. The session lookup might not find the session (wrong userId, wrong ID format)
2. The redirect URL might be wrong
3. The session creation might be failing silently
4. The workout might not exist or not be accessible to the client

### Investigation Steps
1. Check where "Start" button redirects to - what URL is generated?
2. Check if WorkoutSession is being created properly
3. Check if the session's workoutId actually matches a workout the client can access
4. Check if there's a programId issue

---

## Issue 2: Workouts Not Showing Dates/Weeks (P1 - Important)
The client program view should show workouts grouped by week with dates, but it's not displaying correctly.

### Expected Behavior
- Workouts should be grouped by weekNumber (1, 2, 3, 4)
- Each week should show the date range or day of week
- Workouts within a week should be ordered by dayOfWeek

### Possible Root Causes
1. The weekNumber/dayOfWeek fields might not be populated in the database
2. The API response might not include week grouping data
3. The frontend might not be rendering the week headers

### Investigation Steps
1. Check if workout records have weekNumber/dayOfWeek populated
2. Check the API response structure for week data
3. Check the frontend rendering logic for week headers

---

## Success Criteria
1. Client can click "Start" on any workout from their program and see the workout page (no 404)
2. Workouts display with week headers showing the week number and/or date