# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start development server
npm run dev

# Build for production (includes Prisma client generation)
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Run tests
npm test
```

### Database Management
```bash
# Run migrations in development
npx prisma migrate dev

# Deploy migrations to production
npx prisma migrate deploy

# Generate Prisma client (automatically runs during build)
npx prisma generate

# Seed database with initial data
npx prisma db seed

# Open Prisma Studio to view/edit database
npx prisma studio
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests for a specific file
npm test -- __tests__/activity/activity-item.test.tsx
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Auth**: Clerk (migrated from NextAuth)
- **Services**: Resend (email), Cloudinary (images), Anthropic AI SDK (coaching)

### Directory Structure
```
app/
├── (auth)/           # Auth pages - public routes
├── (dashboard)/      # Protected dashboard route group
├── (frontpage)/      # Landing page - public
├── api/              # REST API endpoints
└── dashboard/        # Dashboard pages (protected by middleware)

components/
├── ui/               # shadcn/ui base components
├── activity/         # Activity/habit tracking components
├── coach/            # Coaching features
├── meal/             # Meal tracking
├── workout/          # Workout management
└── [feature]/        # Other feature-specific components

lib/
├── api/              # API utility functions
├── validations/      # Zod schemas
└── *.ts              # Utility functions (auth, db, email, etc.)
```

### Key Patterns

1. **Server Components by Default**: Use `"use client"` only when needed for interactivity
2. **API Routes**: Follow RESTful patterns in `/app/api/`
3. **Authentication**: All `/dashboard/*` routes are protected by Clerk middleware
4. **Database Access**: Use Prisma client through `lib/db.ts`
5. **Form Validation**: Use Zod schemas from `lib/validations/`
6. **Error Handling**: API routes should return appropriate HTTP status codes
7. **Type Safety**: Leverage TypeScript throughout, avoid `any` types

### Database Schema Overview

Key models and relationships:
- **User**: Central model with coach/student relationships
- **Activity & ActivityLog**: Habit tracking with daily logs
- **Meal**: Nutrition tracking with macros
- **Workout & Exercise**: Fitness routines with custom/predefined exercises
- **Goal**: User goals with progress tracking
- **Message & Conversation**: In-app messaging system

### API Endpoint Patterns

```
/api/activities          # CRUD for activities
/api/activities/[id]/logs # Activity logs
/api/users/[id]/...      # User-specific resources
/api/workouts            # Workout management
/api/meals               # Meal tracking
/api/conversations       # Messaging
```

### Authentication Flow

1. Clerk handles all authentication
2. Middleware (`middleware.ts`) protects dashboard routes
3. Use `auth()` from `@clerk/nextjs` to get current user
4. Webhook at `/api/webhooks/clerk` syncs users to database

### Environment Variables

Critical variables that must be set:
- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_SECRET_KEY` - Clerk authentication
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `RESEND_API_KEY` - Email service
- `NEXT_PUBLIC_APP_URL` - Application URL

### Design Principles (CRITICAL)

**MOBILE-FIRST: This is a mobile-primary application.**
- All UI/UX must be designed for mobile first, desktop is secondary
- Test all changes on mobile viewport before committing
- Use responsive classes (`md:`, `lg:`) to enhance mobile-first designs
- Mobile navigation must have feature parity with desktop
- Touch targets must be minimum 44x44px
- Content must be readable and accessible on small screens

### Common Development Tasks

1. **Adding a new feature**: Create components in `/components/[feature]/`, add API routes if needed, update Prisma schema if database changes required
2. **Adding a new page**: Create in appropriate directory under `/app`, ensure proper layout inheritance
3. **Modifying database**: Update `prisma/schema.prisma`, run `npx prisma migrate dev`
4. **Adding API endpoint**: Follow existing patterns in `/app/api/`, use proper HTTP methods and status codes
5. **Email templates**: Add to `/emails/` directory using React Email components

### Testing Approach

- Component tests use Jest and React Testing Library
- Test files are in `__tests__/` directory mirroring component structure
- Mock Clerk authentication in tests using provided test utilities
- Use `@testing-library/user-event` for user interactions

### Performance Considerations

1. Use dynamic imports for heavy components
2. Leverage Next.js Image component for optimized images
3. Implement proper loading states using `loading.tsx` files
4. Use React Suspense boundaries where appropriate
5. Minimize client-side JavaScript by utilizing server components