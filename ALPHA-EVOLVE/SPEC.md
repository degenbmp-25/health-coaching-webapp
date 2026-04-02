# SPEC.md — Variable-Week Program Support

**Project:** habithletics-redesign-evolve  
**Generated:** 2026-04-01  
**Phase:** Architect (alpha-evolve loop)

---

## 1. Functionality Specification

### 1.1 Program Date/Duration Tracking

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | `DateTime?` | No | When the program begins. Used to calculate workout dates. |
| `totalWeeks` | `Int?` | No | Program duration in weeks (1–52). Defaults to inferred max from workouts. |

**Behavior:**
- Programs without `startDate` still work — date calculations are skipped
- Programs without `totalWeeks` infer duration from highest `weekNumber` in workouts
- Trainers can set both fields on the program detail page

### 1.2 Workout Scheduling

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scheduledDate` | `DateTime?` | No | Explicit date for this workout. Overrides calculated date. |
| `weekNumber` | `Int?` | No | Which week (1–52). Already exists, must be assignable by trainers. |
| `dayOfWeek` | `Int?` | No | Day within week (0=Sun to 6=Sat). Already exists. |

**Date Calculation Logic:**
```
If scheduledDate exists → use it directly
Else if startDate exists → startDate + ((weekNumber - 1) * 7) + dayOfWeek days
Else → show "Unscheduled"
```

### 1.3 Client-Facing Features

- **"Week X of Y" Progress Banner:** Calculated from `startDate` + today's date vs `totalWeeks`
- **Workout Grouping:** Grouped by `weekNumber`, sorted ascending
- **Workout Dates:** Display calculated date (or explicit `scheduledDate`)
- **Week Navigation:** Filter/view by specific week

### 1.4 Trainer/Coach Features

- **Program Settings:** Edit `startDate` and `totalWeeks` on program detail page
- **Week Assignment:** Dropdown when adding/editing workouts to assign `weekNumber`
- **Week Filtering:** Filter workouts by week on program detail
- **Bulk Week Assignment:** When importing from spreadsheet, preserve week mapping

---

## 2. Technical Approach

### 2.1 Data Model Changes (Prisma)

```prisma
model Program {
  // ... existing fields ...
  startDate   DateTime?  // NEW: Program start date
  totalWeeks  Int?       // NEW: Duration in weeks (1-52)
  
  workouts    Workout[]
}

model Workout {
  // ... existing fields ...
  scheduledDate DateTime?  // NEW: Optional explicit date override
  weekNumber    Int?       // Already exists: 1-52
  dayOfWeek     Int?       // Already exists: 0-6
}
```

### 2.2 API Changes

#### `PATCH /api/programs/[id]`
**Add support for:**
```typescript
{
  startDate?: string  // ISO date string
  totalWeeks?: number // 1-52
}
```

#### `GET /api/workouts/program/[programId]`
**Response enhancement:**
```typescript
{
  program: {
    id: string
    name: string
    description: string | null
    startDate: string | null   // NEW
    totalWeeks: number | null  // NEW
  },
  workouts: Workout[],
  groupedByWeek: Record<number, Workout[]>,
  // NEW: Current week calculation
  currentWeek: number | null   // Based on today's date vs startDate
}
```

#### `PATCH /api/workouts/[workoutId]`
**Add support for:**
```typescript
{
  // ... existing fields ...
  scheduledDate?: string  // ISO date string
}
```

#### `POST /api/programs/[id]/workouts` (new route)
**Create workout within a program with week assignment:**
```typescript
{
  name: string
  description?: string
  weekNumber: number       // Required for program workouts (1-52)
  dayOfWeek?: number       // 0-6
  scheduledDate?: string   // Optional override
  exercises: ExerciseInput[]
}
```

### 2.3 Frontend Changes

#### Trainer Program Detail (`/trainer/programs/[id]`)
1. Add "Program Settings" section with:
   - Start Date picker (`<input type="date">`)
   - Total Weeks selector (1-52 dropdown)
2. Show `weekNumber` badge on each workout in the list
3. Add week filter tabs above workout list
4. When adding workouts, include week assignment dropdown

#### Client Program Detail (`/client/programs/[id]`)
1. Add "Week X of Y" progress banner at top (calculated from `startDate`)
2. Show calculated workout dates alongside week info
3. Display "Today" highlight if current week matches
4. Week filter tabs (already partially implemented)

#### Workout Edit/Create (`/dashboard/workouts/[workoutId]/edit`, `/dashboard/workouts/new`)
1. Add Week Number dropdown (1-52)
2. Add Day of Week dropdown (Sun-Sat)
3. Add Scheduled Date picker (optional override)

---

## 3. File Structure

### Files to CREATE:
```
app/api/programs/[id]/workouts/route.ts   # Create workout in program with week assignment
```

### Files to MODIFY:

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `startDate`, `totalWeeks` to Program; `scheduledDate` to Workout |
| `app/api/programs/[id]/route.ts` (PATCH) | Handle `startDate`, `totalWeeks` updates |
| `app/api/workouts/program/[programId]/route.ts` | Include new fields in response, calculate currentWeek |
| `app/api/workouts/[workoutId]/route.ts` | Handle `scheduledDate` in PATCH |
| `app/api/workouts/route.ts` | Handle `scheduledDate` in POST |
| `app/trainer/programs/[id]/page.tsx` | Add program settings form, show week badges |
| `app/client/programs/[id]/page.tsx` | Add "Week X of Y" banner, show dates |
| `app/dashboard/workouts/[workoutId]/edit/page.tsx` | Add week/day/scheduledDate fields |
| `app/dashboard/workouts/new/page.tsx` | Add week/day fields |

### Utility Functions to CREATE:
```
lib/program-utils.ts
  - calculateCurrentWeek(startDate, totalWeeks): number | null
  - calculateWorkoutDate(program, workout): Date | null
  - formatWeekDisplay(weekNumber, totalWeeks): string  // "Week 3 of 8"
```

---

## 4. Migration Plan

### Step 1: Prisma Migration
```bash
npx prisma migrate dev --name add_program_weeks_and_scheduled_date
```

### Step 2: API Updates (in order)
1. Update `PATCH /api/programs/[id]` — add `startDate`, `totalWeeks`
2. Update `app/api/workouts/route.ts` POST — add `scheduledDate`
3. Update `app/api/workouts/[workoutId]/route.ts` PATCH — add `scheduledDate`
4. Update `app/api/workouts/program/[programId]/route.ts` GET — include new fields, calculate `currentWeek`
5. Create `app/api/programs/[id]/workouts/route.ts` POST

### Step 3: Frontend Updates (in order)
1. Add `lib/program-utils.ts` utilities
2. Update trainer program detail page (settings + week badges)
3. Update client program detail page ("Week X of Y" + dates)
4. Update workout edit/create forms

### Step 4: Testing
- Verify programs without `startDate` still work
- Verify existing workouts with `null` weekNumber remain accessible
- Test date calculations with various startDate configurations

---

## 5. Constraints & Backwards Compatibility

- **Null-safe:** All new fields are optional (`?`) — no breaking changes
- **Existing workouts:** Those with `weekNumber: null` render as "Unassigned"
- **No startDate:** When `startDate` is null, skip date calculations, show "Date TBD"
- **Auth unchanged:** All existing authorization checks preserved
- **No spreadsheet re-import needed:** Week data already exists in imported workouts
