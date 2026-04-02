# Requirements: Weeks/Date Support for Workout Programs

**Codebase:** /home/magic_000/BeastmodeVault/vault/projects/habithletics-redesign-evolve
**Deployment URL:** https://habithletics-redesign-evolve-coral.vercel.app
**Started:** 2026-04-01 20:33 EDT

## Problem Statement

Currently, the program structure assumes a fixed number of weeks (e.g., 5 weeks from the imported spreadsheet). But real-world programs have VARIABLE lengths:

- Some programs are 4 weeks
- Some are 8 weeks
- Some are 12 weeks
- Some programs repeat cycles
- Different clients have different program lengths

## Current State

- Workouts have `weekNumber` and `dayOfWeek` fields (added in previous loops)
- The imported program has 5 weeks of data (all set to weekNumber=1)
- Programs are not tracking their total duration or start date

## Requirements

### 1. Program Date/Duration Tracking
- Add `startDate` (optional Date) to Program model
- Add `totalWeeks` (optional Int) to Program model  
- Programs should display their duration (e.g., "5 weeks" or "8-week program")

### 2. Workout Week Assignment
- Allow assigning workouts to specific week numbers (1, 2, 3, etc.)
- Week numbers should be relative to program start date
- Support programs with 1-52 weeks

### 3. Workout Display
- Show which week each workout belongs to
- Show workout date (calculated from program start date + week/day)
- Sort workouts by week number, then day of week

### 4. Trainer/Coach UI
- Allow trainers to set program duration (total weeks)
- Allow trainers to set program start date
- Allow trainers to assign workouts to specific weeks
- Allow filtering/viewing workouts by week

### 5. Client UI
- Show clients which week they're currently on (based on date)
- Show progress through program (Week 3 of 8, etc.)
- Display workout dates relative to program start

## Technical Approach

### Database Changes
```prisma
model Program {
  id          String   @id @default(cuid())
  name        String
  description String?
  startDate   DateTime?  // When the program starts
  totalWeeks  Int?        // Total duration in weeks
  trainerId   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  assignments ProgramAssignment[]
  workouts    Workout[]
}

model Workout {
  // Existing fields...
  weekNumber  Int?       // Which week (1, 2, 3, etc.)
  dayOfWeek   Int?       // Day within week (1-7)
  scheduledDate DateTime? // Optional explicit date
  
  programId   String
  program     Program @relation(fields: [programId], references: [id])
}
```

### API Changes
- `GET /api/programs/[id]` - Include `totalWeeks`, `startDate`
- `PATCH /api/programs/[id]` - Allow updating `totalWeeks`, `startDate`
- `GET /api/programs/[id]/workouts` - Include weekNumber, sort by week/day
- `POST /api/programs/[id]/workouts` - Allow setting weekNumber, dayOfWeek
- `PATCH /api/workouts/[workoutId]` - Allow updating weekNumber, dayOfWeek

### Frontend Changes
- Program detail page: Show/edit duration and start date
- Workout list: Group by week, show week headers
- Workout edit: Week/day selector dropdowns
- Client dashboard: Show "Week X of Y" progress indicator

## Constraints
- Don't break existing functionality
- Programs without startDate should still work (just no date calculation)
- Existing workouts with null weekNumber should remain accessible
- Must work with Clerk auth and multi-tenant organization model

## Acceptance Criteria
1. Trainer can set program duration (totalWeeks)
2. Trainer can set program start date
3. Trainer can assign workouts to specific weeks
4. Workout list shows workouts grouped by week number
5. Client sees "Week X of Y" progress indicator
6. No breaking changes to existing features
