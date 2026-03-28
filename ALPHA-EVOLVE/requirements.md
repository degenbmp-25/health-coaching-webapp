# Multi-Tenant Architecture - Requirements

## Problem Statement

Habithletics currently operates as a single-tenant application where trainers create workouts for individual clients. This limits scalability for:
- Gyms/Organizations needing multi-trainer management
- Trainers wanting to manage multiple clients with shared program templates
- Teams where trainers cover each other's clients during absences

The app needs a multi-tenant architecture supporting Organizations (gyms), Trainers, and Clients with shared program libraries and Google Sheets integration for workout completion sync.

---

## Feature Requirements

### 1. Organization Management
- Organizations can be "gym" or "personal" type
- Gym-type organizations have owners who manage trainers
- Organization owners can invite trainers and clients
- Users can belong to multiple organizations with different roles

### 2. Role-Based Access
- **Owner**: Full control of organization, can manage trainers and view all data
- **Trainer**: Create/edit programs, assign to clients, view own clients' progress
- **Client**: View assigned programs, log workouts, see own progress

### 3. Program System
- Programs are reusable workout templates created by trainers
- Programs can be assigned to multiple clients
- Clients see their assigned programs as personalized workout lists
- Program assignments track start date for progress tracking

### 4. Trainer Teams
- Multiple trainers can work under one organization
- Trainers can be assigned as "primary" for clients
- Trainers can view and manage each other's clients (with permissions)
- Coverage mode: trainers can temporarily manage others' clients

### 5. Google Sheets Sync
- Each trainer connects their own Google Sheet
- Workout completions sync bidirectionally:
  - Date, exercises performed, sets, reps, weights, notes
- Sync triggered on session completion
- Manual re-sync option available

### 6. Pricing Tiers
- **Individual**: Single trainer, up to 20 clients
- **Organization <10 trainers**: Up to 10 trainers, unlimited clients
- **Organization >10 trainers**: Enterprise tier, unlimited everything

---

## User Stories

### As an Organization Owner
- I can create an organization and invite trainers
- I can view all trainers and their client rosters
- I can assign/remove trainers from my organization
- I can see aggregate analytics for all trainers

### As a Trainer
- I can create workout programs with multiple workouts
- I can assign programs to my clients
- I can connect my Google Sheet for data sync
- I can view my clients' workout completion history
- I can take over coverage for another trainer's clients

### As a Client
- I can view my assigned program and workouts
- I can log workout completions with sets/reps/weights
- I can add session notes (RPE, pain points, etc.)
- My completions automatically sync to my trainer's Google Sheet

---

## Data Model Summary

### New Models
- `Organization`: id, name, type, createdAt
- `OrganizationMember`: organizationId, userId, role
- `Program`: id, name, description, organizationId, createdById
- `ProgramAssignment`: programId, clientId, startedAt
- `SheetConnection`: organizationId, trainerId, sheetUrl, sheetId

### Extended Models
- `User`: Add organizationRole, primaryTrainerId
- `WorkoutSession`: Add notes field

---

## Out of Scope (v1)
- Billing/subscription management (separate system)
- Organization transfer/merge
- Advanced permissions beyond owner/trainer/client
- Mobile-native views (responsive web is acceptable)
