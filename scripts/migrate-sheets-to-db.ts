#!/usr/bin/env npx tsx
/**
 * Migration Script: Google Sheets → Neon Database
 * 
 * This script imports workout data from Google Sheets into the multi-tenant
 * database schema (Organization → Program → Workout → WorkoutExercise → Exercise)
 * 
 * Usage:
 *   npx tsx scripts/migrate-sheets-to-db.ts
 * 
 * Prerequisites:
 *   - Database migrations must be applied (npx prisma migrate deploy)
 *   - NEXT_PUBLIC_SHEET_CSV_URL env var must be set
 *   - DATABASE_URL env var must be set
 */

import { PrismaClient } from '@prisma/client';
import { fetchWorkouts, type Workout, type Exercise } from '../lib/sheets';

const prisma = new PrismaClient();

const ORGANIZATION_NAME = 'Habithletics Gym';
const PROGRAM_NAME = 'Strength & Conditioning';
const DEMO_USER_EMAIL = 'demo@habithletics.app';
const DEMO_USER_NAME = 'Demo User';

async function createOrGetOrganization() {
  let org = await prisma.organization.findFirst({
    where: { name: ORGANIZATION_NAME },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: ORGANIZATION_NAME,
        type: 'gym',
      },
    });
    console.log(`✅ Created organization: ${org.name} (${org.id})`);
  } else {
    console.log(`ℹ️  Organization already exists: ${org.name} (${org.id})`);
  }

  return org;
}

async function createOrGetDemoUser() {
  // For demo purposes, we create a placeholder user
  // In production, users would be created via Clerk auth
  let user = await prisma.user.findFirst({
    where: { email: DEMO_USER_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        clerkId: 'demo_clerk_id',
        email: DEMO_USER_EMAIL,
        name: DEMO_USER_NAME,
        role: 'user',
        organizationRole: 'owner',
      },
    });
    console.log(`✅ Created demo user: ${user.name} (${user.id})`);
  } else {
    console.log(`ℹ️  Demo user already exists: ${user.name} (${user.id})`);
  }

  return user;
}

async function createOrganizationMembership(orgId: string, userId: string) {
  const existing = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: userId,
    },
  });

  if (!existing) {
    await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: userId,
        role: 'owner',
      },
    });
    console.log(`✅ Added user to organization as owner`);
  } else {
    console.log(`ℹ️  User already member of organization`);
  }
}

async function createOrGetProgram(organizationId: string, createdById: string) {
  let program = await prisma.program.findFirst({
    where: {
      organizationId: organizationId,
      name: PROGRAM_NAME,
    },
  });

  if (!program) {
    program = await prisma.program.create({
      data: {
        name: PROGRAM_NAME,
        description: 'Main workout program imported from Google Sheets',
        organizationId: organizationId,
        createdById: createdById,
      },
    });
    console.log(`✅ Created program: ${program.name} (${program.id})`);
  } else {
    console.log(`ℹ️  Program already exists: ${program.name} (${program.id})`);
  }

  return program;
}

async function createOrGetExercise(exercise: Exercise, userId: string): Promise<string> {
  // Check if exercise with same name exists
  let existing = await prisma.exercise.findFirst({
    where: {
      name: exercise.name,
      userId: userId,
    },
  });

  if (!existing) {
    existing = await prisma.exercise.create({
      data: {
        name: exercise.name,
        category: exercise.category || 'General',
        muscleGroup: 'Unknown', // Sheets data doesn't have this
        notes: exercise.notes,
        userId: userId,
      },
    });
  }

  return existing.id;
}

async function createWorkoutWithExercises(
  workout: Workout,
  programId: string,
  userId: string
) {
  // Check if workout with same name exists under this program
  let existing = await prisma.workout.findFirst({
    where: {
      name: workout.name,
      programId: programId,
    },
    include: {
      exercises: {
        include: {
          exercise: true,
        },
      },
    },
  });

  if (existing) {
    console.log(`ℹ️  Workout already exists: ${existing.name} (${existing.id})`);
    return existing;
  }

  // Create workout
  const newWorkout = await prisma.workout.create({
    data: {
      name: workout.name,
      description: `Workout from ${workout.category || 'main'} program`,
      userId: userId,
      programId: programId,
    },
  });

  console.log(`✅ Created workout: ${newWorkout.name} (${newWorkout.id})`);

  // Create workout exercises
  for (let i = 0; i < workout.exercises.length; i++) {
    const sheetExercise = workout.exercises[i];
    const exerciseId = await createOrGetExercise(sheetExercise, userId);

    await prisma.workoutExercise.create({
      data: {
        workoutId: newWorkout.id,
        exerciseId: exerciseId,
        sets: sheetExercise.sets,
        reps: parseInt(sheetExercise.reps.replace(/[^\d]/g, '')) || 10,
        weight: sheetExercise.load[0] ? parseFloat(sheetExercise.load[0]) : null,
        notes: sheetExercise.notes,
        videoUrl: sheetExercise.videoUrl || null,
        order: i,
      },
    });

    if (sheetExercise.videoUrl) {
      console.log(`   📹 Added video to "${sheetExercise.name}": ${sheetExercise.videoUrl}`);
    }
  }

  return newWorkout;
}

async function migrate() {
  console.log('🚀 Starting sheets → database migration\n');
  console.log('='.repeat(50));

  try {
    // 1. Create/fetch organization
    const org = await createOrGetOrganization();

    // 2. Create/fetch demo user
    const user = await createOrGetDemoUser();

    // 3. Add user to organization
    await createOrganizationMembership(org.id, user.id);

    // 4. Create/fetch program
    const program = await createOrGetProgram(org.id, user.id);

    // 5. Fetch workouts from Google Sheets
    console.log('\n📊 Fetching workouts from Google Sheets...');
    const workouts = await fetchWorkouts();
    console.log(`   Found ${workouts.length} workouts\n`);

    // 6. Create workouts with exercises
    for (const workout of workouts) {
      await createWorkoutWithExercises(workout, program.id, user.id);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration completed successfully!');

    // Print summary
    const workoutCount = await prisma.workout.count({
      where: { programId: program.id },
    });
    const exerciseCount = await prisma.workoutExercise.count({
      where: {
        workout: {
          programId: program.id,
        },
      },
    });
    const videosCount = await prisma.workoutExercise.count({
      where: {
        videoUrl: { not: null },
        workout: {
          programId: program.id,
        },
      },
    });

    console.log(`\n📈 Summary:`);
    console.log(`   - Programs: 1`);
    console.log(`   - Workouts: ${workoutCount}`);
    console.log(`   - Exercises: ${exerciseCount}`);
    console.log(`   - Videos: ${videosCount}`);
    console.log(`   - Organization: ${org.name}`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrate();
