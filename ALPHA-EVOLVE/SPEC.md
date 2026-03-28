# Multi-Tenant Architecture - Implementation Spec

## 1. Prisma Schema Changes

```prisma
// ============================================
// NEW MODELS
// ============================================

// Organization - represents a gym or personal training business
model Organization {
  id        String   @id @default(cuid())
  name      String
  type      String   // "gym" | "personal"
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  members        OrganizationMember[]
  programs       Program[]
  sheetConnections SheetConnection[]

  @@map("organizations")
}

// OrganizationMember - junction table for users ↔ organizations with roles
model OrganizationMember {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  userId         String   @map("user_id")
  role           String   // "owner" | "trainer" | "client"
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  // A user can only have one role per organization
  @@unique([organizationId, userId])
  @@map("organization_members")
}

// Program - a reusable workout template owned by an organization
model Program {
  id             String   @id @default(cuid())
  name           String
  description    String?
  organizationId String   @map("organization_id")
  createdById    String   @map("created_by_id")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // Relations
  organization   Organization        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy      User                @relation("ProgramCreator", fields: [createdById], references: [id])
  workouts       Workout[]           // Programs contain multiple workouts
  assignments    ProgramAssignment[]

  @@map("programs")
}

// ProgramAssignment - links a program to a specific client
model ProgramAssignment {
  id         String   @id @default(cuid())
  programId  String   @map("program_id")
  clientId   String   @map("client_id")
  startedAt  DateTime @default(now()) @map("started_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relations
  program Program @relation(fields: [programId], references: [id], onDelete: Cascade)
  client  User    @relation("ClientPrograms", fields: [clientId], references: [id])

  // A client can only be assigned a program once (per program)
  @@unique([programId, clientId])
  @@map("program_assignments")
}

// SheetConnection - Google Sheet link per trainer per organization
model SheetConnection {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  trainerId      String   @map("trainer_id")
  sheetUrl       String   @map("sheet_url")
  sheetId        String   @map("sheet_id")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  trainer      User         @relation("SheetConnections", fields: [trainerId], references: [id])

  // One sheet per trainer per organization
  @@unique([organizationId, trainerId])
  @@map("sheet_connections")
}

// ============================================
// EXTENDED MODELS
// ============================================

// Extend User model with multi-tenant fields
model User {
  // ... existing fields ...

  // Multi-tenant: role within current organization context
  organizationRole String?  @map("organization_role") // "owner" | "trainer" | "client"
  
  // Multi-tenant: primary trainer for this client
  primaryTrainerId String?  @map("primary_trainer_id")
  primaryTrainer  User?     @relation("TrainerToClients", fields: [primaryTrainerId], references: [id], onDelete: SetNull)
  clients         User[]   @relation("TrainerToClients")

  // Relations - NEW
  organizationMemberships OrganizationMember[]
  createdPrograms         Program[]           @relation("ProgramCreator")
  programAssignments      ProgramAssignment[]  @relation("ClientPrograms")
  sheetConnections        SheetConnection[]   @relation("SheetConnections")
}

// Extend WorkoutSession with notes
model WorkoutSession {
  // ... existing fields ...

  // Session-level notes for context (RPE, pain, mood, etc.)
  notes String? @db.Text

  // Relations - existing remain unchanged
}

// ============================================
// RELATION UPDATES
// ============================================

// Program -> Workout: One-to-Many (program contains workouts)
model Workout {
  // ... existing fields ...

  programId String?  @map("program_id")
  program   Program? @relation(fields: [programId], references: [id], onDelete: SetNull)

  // Relations - existing remain, add programId
  @@map("workouts")
}
```

---

## 2. API Endpoints

### Organizations
```
POST   /api/organizations              - Create organization
GET    /api/organizations/:id          - Get organization details
PATCH  /api/organizations/:id          - Update organization
DELETE /api/organizations/:id          - Delete organization (owner only)

GET    /api/organizations/:id/members  - List organization members
POST   /api/organizations/:id/members  - Invite member
PATCH  /api/organizations/:id/members/:userId - Update member role
DELETE /api/organizations/:id/members/:userId - Remove member
```

### Programs
```
POST   /api/programs                   - Create program
GET    /api/programs/:id                - Get program details
PATCH  /api/programs/:id                - Update program
DELETE /api/programs/:id                - Delete program

GET    /api/organizations/:id/programs - List organization's programs
```

### Program Assignments
```
POST   /api/program-assignments        - Assign program to client
GET    /api/program-assignments/client/:clientId - Get client's programs
DELETE /api/program-assignments/:id    - Remove assignment
```

### Sheets
```
POST   /api/sheets/connect              - Connect Google Sheet
GET    /api/sheets/:trainerId           - Get trainer's sheet config
DELETE /api/sheets/:id                   - Disconnect sheet
POST   /api/sheets/sync/:sessionId      - Trigger manual sync
```

### Workouts (extend existing)
```
GET    /api/workouts/program/:programId - Get workouts in program
POST   /api/workouts/:id/assign        - Add workout to program
```

### Sessions (extend existing)
```
POST   /api/sessions/:id/complete       - Complete session + trigger sync
PATCH  /api/sessions/:id                 - Update session (including notes)
```

---

## 3. Admin UI Pages

### /admin/organizations
- List all organizations (for platform admins)
- Organization details: name, type, member count, trainer count

### /admin/organizations/[id]
- Organization settings
- Member management table
- Trainer roster with client counts
- Sheet connection status per trainer

### /admin/organizations/[id]/programs
- All programs in organization
- Program creation/editing
- Assign programs to clients

### /admin/organizations/[id]/members
- Invite members (by email)
- Role management dropdown
- Remove member button
- Bulk actions: invite multiple trainers

### /admin/sheets
- Sheet connection status for all trainers
- Sync status and history
- Manual sync trigger

---

## 4. Client UI Pages

### /client/programs
- List of assigned programs
- Program cards showing name, workout count, start date

### /client/programs/[id]
- Program detail view
- List of workouts in program
- Progress indicator (completed vs upcoming)

### /client/workouts
- Today's workouts (from assigned programs)
- Quick-start workout buttons

### /client/workouts/[id]
- Workout exercises list
- Start workout button
- Session history link

### /client/session/[id]
- Active workout logging
- Set logging with weight/reps
- Session notes field (expandable)
- Complete session button

### /client/progress
- Completion history calendar
- Stats: total workouts, volume lifted
- Trainer feedback section (future)

---

## 5. Trainer UI Pages

### /trainer/clients
- Client roster table
- Primary vs coverage clients
- Quick access to client profiles

### /trainer/clients/[id]
- Client profile
- Assigned programs
- Workout history
- Notes from sessions

### /trainer/programs
- My programs (created by me or organization)
- Create new program
- Duplicate existing program

### /trainer/programs/[id]
- Program builder
- Add/remove/reorder workouts
- Assign to clients button

### /trainer/sheets
- My sheet connection
- Connect/disconnect
- Sync status
- Last sync timestamp

---

## 6. Google Sheets Sync Architecture

### Sheet Structure
Each trainer's sheet should have a tab per client with columns:
```
Date | Workout | Exercise | Set | Reps | Weight | Notes | SessionId
```

### Sync Flow
```
1. Client completes workout session
2. Server receives PATCH /api/sessions/:id (complete)
3. System queues sync job (background)
4. Job reads WorkoutSession with all SetLogs
5. Job formats data for Google Sheets API
6. Job appends rows to trainer's sheet
7. Job updates sync status in database
```

### Conflict Resolution
- Last-write-wins for same set
- Session ID tracked to prevent duplicates
- Failed syncs retry 3x with exponential backoff
- Manual sync available for failed syncs

### API Integration
```typescript
// Google Sheets API v4
// 1. Append rows: spreadsheets.values.append
// 2. Clear range: spreadsheets.values.clear (for corrections)
// 3. Batch update for bulk operations
```

### Sync Data Shape
```typescript
interface SyncPayload {
  sessionId: string;
  clientId: string;
  clientName: string;
  date: string; // ISO
  workoutName: string;
  exercises: {
    name: string;
    sets: {
      setNumber: number;
      reps: number | null;
      weight: number | null;
      notes: string;
    }[];
  }[];
  sessionNotes: string;
}
```

---

## 7. Migration Plan for Existing Data

### Phase 1: Schema Migration
```sql
-- Add new tables
CREATE TABLE organizations (...);
CREATE TABLE organization_members (...);
CREATE TABLE programs (...);
CREATE TABLE program_assignments (...);
CREATE TABLE sheet_connections (...);

-- Add columns to existing tables
ALTER TABLE users ADD COLUMN organization_role TEXT;
ALTER TABLE users ADD COLUMN primary_trainer_id TEXT REFERENCES users(id);
ALTER TABLE workouts ADD COLUMN program_id TEXT REFERENCES programs(id);
ALTER TABLE workout_sessions ADD COLUMN notes TEXT;
```

### Phase 2: Data Backfill
```sql
-- Convert existing coach-student relationships to organization structure
-- For each unique coachId:
--   1. Create a "Personal Training" organization
--   2. Add coach as owner/trainer
--   3. Add students as clients with primaryTrainerId set

-- Migrate existing workouts to programs:
--   1. Create a default "My Workouts" program per user
--   2. Link existing workouts to this program
```

### Phase 3: Application Updates
1. Add organization context to user session
2. Update workout creation to optionally belong to program
3. Add notes field to session completion UI
4. Implement sheet connection flow
5. Add sync trigger on session completion

### Phase 4: Rollback Plan
- Keep coachId and coach relation until v2
- Sheet sync writes to legacy column before dropping
- 30-day dual-write period for sync verification

---

## 8. Implementation Notes

### Pricing Tier Enforcement
```typescript
// Middleware check on organization creation/update
const TIER_LIMITS = {
  individual: { trainers: 1, clients: 20 },
  organization_small: { trainers: 10, clients: -1 },
  organization_enterprise: { trainers: -1, clients: -1 }
};
```

### Coverage Mode
```typescript
// When trainer B covers trainer A's clients:
// 1. Trainer B's OrganizationMember.role = "trainer"
// 2. Trainer B gets read access to trainer A's clients
// 3. Trainer A marks coverage period in system
// 4. Trainer B's sheet still receives syncs (trainer B is the active trainer)
```

### Program Assignment Flow
```typescript
// When assigning program to client:
1. Validate: client is in same organization as program
2. Validate: trainer has permission (owner or program creator)
3. Create ProgramAssignment record
4. Client sees program in their dashboard
5. Client can now start workouts from that program
```

---

## 9. Files to Create/Modify

### New Files
- `prisma/migrations/multi_tenant_init/migration.sql`
- `app/api/organizations/route.ts`
- `app/api/organizations/[id]/route.ts`
- `app/api/organizations/[id]/members/route.ts`
- `app/api/programs/route.ts`
- `app/api/programs/[id]/route.ts`
- `app/api/program-assignments/route.ts`
- `app/api/sheets/connect/route.ts`
- `app/api/sheets/sync/[sessionId]/route.ts`
- `lib/google-sheets.ts`
- `lib/sync-service.ts`

### Modified Files
- `prisma/schema.prisma` - Add new models and fields
- `app/api/workouts/route.ts` - Add programId
- `app/api/sessions/[id]/route.ts` - Add notes, trigger sync
- `app/page.tsx` - Add org context selector
- `app/client/*` - Add client UI pages
- `app/trainer/*` - Add trainer UI pages
- `app/admin/*` - Add admin UI pages
