# Review Report - Loop 1

## CRITICAL Issues

### [lib/program-utils.ts:41] `calculateCurrentWeek` returns 0 for unstarted programs - causes "Week 0 of X" display
**Issue:** When `diffDays < 0` (program hasn't started), the function returns `0`. The client page then displays "Currently Week 0 of 8" which is nonsensical.
**Fix:**
```typescript
// Change return 0 to return null
if (diffDays < 0) {
  return null  // null signals "not started yet"
}
```
And update client page to handle null currentWeek:
```typescript
{program.currentWeek === null && program.program.startDate && (
  <p className="font-medium">Program starts {formatDate(program.program.startDate)}</p>
)}
```

### [app/trainer/programs/[id]/page.tsx:212] Empty startDate causes "Invalid Date"
**Issue:** When startDate input is empty (`""`), the code does:
```typescript
startDate: startDate ? new Date(startDate).toISOString() : null,
```
Empty string is truthy in JS, so `new Date("").toISOString()` → "Invalid Date" error.
**Fix:**
```typescript
startDate: startDate !== "" ? new Date(startDate).toISOString() : null,
```

### [app/api/programs/[id]/workouts/route.ts:42] POST allows invalid weekNumber (0)
**Issue:** The `createWorkoutSchema` has:
```typescript
weekNumber: z.number().int().min(1).max(52).optional().nullable(),
```
But `z.number().int().min(1)` only validates if the value IS a number. If `weekNumber: 0` is passed, Zod validates `0 >= 1` which fails, BUT if `weekNumber: null` is passed, it passes the nullable check without ever validating the min. Actually this is fine because nullable allows null. The real issue is `0` would fail the min(1) check correctly.

Wait, let me reconsider. The actual bug is that if `weekNumber: 0` is passed, it correctly fails. If `weekNumber: null` is passed, it correctly allows null. This is actually fine.

**Re-assessing - no bug here.**

### [app/api/workouts/[workoutId]/route.ts:48] `scheduledDate: undefined` not handled correctly in PATCH
**Issue:** The ternary:
```typescript
scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : body.scheduledDate === null ? null : undefined,
```
If `body.scheduledDate` is `undefined` (field not provided), this returns `undefined`. But Prisma's update doesn't skip the field when value is `undefined` - it may set it to null or cause a type error depending on schema.
**Fix:**
```typescript
scheduledDate: body.scheduledDate !== undefined 
  ? (body.scheduledDate ? new Date(body.scheduledDate) : null) 
  : undefined,
```

---

## HIGH Issues

### [app/api/workouts/program/[programId]/route.ts:88] `isNaN` check missing for week filter
**Issue:**
```typescript
const weekNum = parseInt(weekFilter, 10)
if (!isNaN(weekNum)) {
  whereClause.weekNumber = weekNum
}
```
If `weekFilter` is "abc", `parseInt` returns `NaN`, and `!isNaN(NaN)` is false, so it doesn't set the whereClause. This is actually correct behavior - invalid values are ignored rather than causing errors. **Not a bug, safe default.**

Actually wait - let me re-check. If weekFilter is "abc", it doesn't set weekNumber, so all workouts are returned. That's the safe behavior. Not a bug.

### [app/api/programs/[id]/route.ts:85] `totalWeeks` validation allows 0 via `min(1)` but might accept 0 if sent as number
**Issue:** Zod's `z.number().int().min(1).max(52)` correctly rejects 0. But there's a subtle issue: if someone sends `totalWeeks: 0` via JSON, Zod correctly rejects it. If they send `totalWeeks: null`, it passes nullable. If they send nothing, it's undefined and skipped. This is actually correct.

**Not a bug.**

### [app/trainer/programs/[id]/page.tsx:224] `totalWeeks` input allows empty string then converts to `""`
**Issue:**
```typescript
totalWeeks: totalWeeks !== "" ? Number(totalWeeks) : null,
```
If `totalWeeks === ""`, this sends `null` which is correct. BUT if `totalWeeks === "abc"`, `Number("abc")` returns `NaN`, and `NaN !== ""` is true, so it sends `NaN` which fails Prisma validation.
**Fix:**
```typescript
totalWeeks: totalWeeks !== "" && !isNaN(Number(totalWeeks)) ? Number(totalWeeks) : null,
```

### [app/client/programs/[id]/page.tsx:77] `weekNumber` being 0 treated as "Unassigned" instead of null
**Issue:**
```typescript
const weekSet = new Set<number>()
program.workouts.forEach((w) => weekSet.add(w.weekNumber ?? 0))
```
If `weekNumber` is null, it adds `0` to the set. Then later:
```typescript
const displayedWorkouts = selectedWeek !== null
  ? program.workouts.filter((w) => (w.weekNumber ?? 0) === selectedWeek)
  : program.workouts
```
This is actually consistent but confusing. Week 0 should never exist - null means unassigned.

### [app/client/programs/[id]/page.tsx:101] "Today" check uses string comparison which is locale-dependent
**Issue:**
```typescript
const isToday = workoutDate === new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
```
This could produce different strings depending on locale. It works but is fragile.
**Fix:** Parse both dates and compare day/month/year:
```typescript
const isToday = workoutDate && 
  new Date(workoutDate).toDateString() === new Date().toDateString()
```

---

## MEDIUM Issues

### [app/api/programs/[id]/workouts/route.ts] Missing input validation for `weekNumber: null` intent
**Issue:** When user explicitly sets `weekNumber: null` (to remove week assignment), Zod's `z.number().int().min(1).max(52).optional().nullable()` allows it. But there's no validation that if `weekNumber` is provided as a number it must be 1-52. Actually Zod does this correctly.
**Not a bug.**

### [lib/program-utils.ts:55] `calculateWorkoutDate` defaults `dayOfWeek` to 0 (Sunday) when null
**Issue:**
```typescript
const daysToAdd = (workout.weekNumber - 1) * 7 + (workout.dayOfWeek ?? 0)
```
If dayOfWeek is null, it defaults to Sunday (0). This silently changes intent.
**Fix:** If dayOfWeek is null but weekNumber is set, perhaps use day 0 of that week:
```typescript
const dayOfWeek = workout.dayOfWeek ?? 0  // This is actually fine for scheduling
```
Actually this is reasonable default behavior. Document it though.

### [app/api/workouts/route.ts:91] `scheduledDate` datetime validation too strict for date-only inputs
**Issue:**
```typescript
scheduledDate: z.string().datetime().optional().nullable(),
```
`z.string().datetime()` requires a full ISO datetime like `2024-01-15T00:00:00.000Z`. If user sends just a date like `2024-01-15`, it fails.
**Fix:** Use custom validator:
```typescript
scheduledDate: z.string().refine(
  (val) => !val || !isNaN(Date.parse(val)),
  { message: "Invalid date format" }
).optional().nullable(),
```

### [app/client/programs/[id]/page.tsx:96] `isToday` calculation happens inside render loop - inefficient
**Issue:** `toLocaleDateString` called for every workout on every render. Minor performance issue.
**Fix:** Calculate today's date string once outside the map.

---

## LOW Issues

### [app/api/workouts/[workoutId]/route.ts:31] Role check uses uppercase strings but schema uses lowercase
**Issue:**
```typescript
role: { in: ["OWNER", "TRAINER"] },
```
But schema has `role: String @default("user")` with lowercase values. This would never match.
**Fix:**
```typescript
role: { in: ["owner", "trainer"] },
```

### [lib/program-utils.ts:66] `formatWeekDisplay` returns "Week 0 of 0" for null values
**Issue:**
```typescript
if (weekNumber === null || totalWeeks === null) {
  return "Week 0 of 0"
}
```
"Week 0 of 0" is confusing.
**Fix:**
```typescript
if (weekNumber === null || totalWeeks === null) {
  return "Week ?"
}
```

### [app/trainer/programs/[id]/page.tsx] Date input lacks min/max constraints
**Issue:** The startDate input is `type="date"` but has no `min` attribute to prevent past dates or other reasonable constraints.
**Fix:** Add `min={new Date().toISOString().split('T')[0]}` if only future dates allowed.

### [General] No optimistic UI updates for settings save
**Issue:** When saving settings, user sees no feedback until server responds (~200-500ms).
**Fix:** Not critical but would improve UX.

---

## Quality Score: 5/10

## Production Ready: NO

### Summary
The implementation is partially complete with several critical bugs that would cause runtime errors or incorrect behavior:

1. **CRITICAL:** `calculateCurrentWeek` returns 0 for unstarted programs → "Week 0 of X" display
2. **CRITICAL:** Empty startDate → Invalid Date error when saving
3. **CRITICAL:** `scheduledDate: undefined` handling in workouts PATCH may not work correctly
4. **HIGH:** `totalWeeks` input allows non-numeric strings that would fail at API level
5. **HIGH:** "Today" comparison is locale-dependent and fragile
6. **MEDIUM:** Date-only inputs fail datetime validation
7. **MEDIUM:** dayOfWeek defaults to 0 silently
8. **LOW:** Role check uses wrong case (OWNER vs owner)

### Backwards Compatibility
✅ All new fields are properly nullable in Prisma schema
✅ Existing workouts with null weekNumber remain accessible
✅ Programs without startDate work (date calculations skipped)
⚠️ Some validation inconsistencies between POST and PATCH endpoints

### Security
✅ No SQL injection (using Prisma ORM)
✅ No XSS (React handles escaping)
✅ Authorization checks in place
✅ No credential exposure

### Performance
✅ No O(n²) or worse complexity found
⚠️ Minor: toLocaleDateString called in render loop for every workout
