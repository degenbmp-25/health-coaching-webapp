Jarvis Intelligence Layer for Habithletics
# Alpha-Evolve: Jarvis Intelligence Layer

**Codebase:** Current directory (feat/jarvis-intelligence branch)

**Vision:** Build a "Health Coaching Jarvis" - a compounding knowledge system that grows smarter with every client interaction.

## Requirements

### Core Feature: Client Memory Graph

Build a system that captures and connects client information from multiple sources:

1. **Client Profile Unification**
   - Connect existing workout data (programs, workouts, progress)
   - Connect client notes from vault files
   - Connect insights from Discord channels (client conversations)
   - Connect questionnaire intake data

2. **Coach Notes System**
   - Add notes per client (injuries, preferences, goals)
   - Log conversation insights
   - Track coaching observations over time
   - Tag important client facts

3. **Query Interface**
   - Natural language queries against client data
   - "How's Kevin progressing?"
   - "What should I focus on with this client?"
   - "Any concerns with this client's recovery?"

4. **Data Sources to Connect**
   - Habithletics DB (programs, workouts, sessions)
   - Client vault notes (markdown files per client)
   - Discord channel insights (recent conversations)
   - Questionnaire data (intake form responses)

### Design Principles (Karpathy-style)
- No RAG needed initially - just connect existing data
- Make every interaction compound the knowledge
- Weekly "health checks" to find gaps
- Self-improving system

## Technical Approach
- Next.js 14 with App Router
- Existing Prisma schema
- Add new ClientNote model
- Add new ClientProfile view that aggregates data
- API routes for notes CRUD
- Query interface for natural language access

## Files to Create/Modify
- prisma/schema.prisma (add ClientNote, ClientProfile)
- app/api/clients/[id]/notes/route.ts
- app/api/clients/[id]/profile/route.ts
- components/client/client-profile.tsx
- components/client/notes-panel.tsx
- app/dashboard/clients/[id]/page.tsx (enhanced)

