# Alpha-Evolve Loop 3 Requirements

## Problem Statement
The trainer/client interface has two critical issues that prevent real-world use:
1. Buttons throughout the app don't work (start workout, edit workout, etc.)
2. Programs lack date/week functionality - advanced periodized training requires different workouts for different weeks

## Current State
- Programs contain multiple workouts but no week/day organization
- All workouts appear flat without temporal structure
- Interactive buttons (start, edit, etc.) are non-functional

## Requirements

### 1. Functional Buttons
- [ ] "Start Workout" button must launch workout view with exercise list
- [ ] "Edit Workout" button must open edit mode
- [ ] "Save" button must persist changes
- [ ] All navigation buttons must work
- [ ] Program management buttons must be functional

### 2. Week/Periodization Support
- [ ] Programs must support week-based organization
- [ ] Each week can have different workouts assigned
- [ ] Week 1 might be "Accumulation", Week 4 might be "Deload", etc.
- [ ] Client sees workouts appropriate to their current week
- [ ] Trainer can assign/move workouts across weeks
- [ ] Week number should be configurable (start date + current week)

### 3. Data Model Changes
- [ ] Add `weekNumber` field to workout assignments
- [ ] Or create `ProgramWeek` model linking programs to ordered workout lists
- [ ] Consider `startDate` on Program for calculating current week

### 4. UI Changes
- [ ] Workout list shows week groupings
- [ ] Week selector/slider for navigating periodized programs
- [ ] Visual indicator of current week
- [ ] "This Week's Workout" prominent display

## Success Criteria
- Trainer can create/edit periodized programs with weeks
- Client sees correct workout for current week
- All buttons are functional
- No TypeScript errors
- Production ready

## Priority
CRITICAL - Buttons must work for any real usage
HIGH - Periodization is core functionality for advanced strength programs
