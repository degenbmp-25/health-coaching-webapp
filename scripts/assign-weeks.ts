#!/usr/bin/env npx tsx
/**
 * Auto-assign week numbers to workouts based on workout order.
 * 
 * Assigns weekNumber in a repeating pattern: 1, 2, 3, 4, 1, 2, 3, 4...
 * 
 * Usage:
 *   npx tsx scripts/assign-weeks.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORKOUTS_PER_WEEK = 4;

async function assignWeeks() {
  console.log('Fetching workouts...');

  // Get all workouts ordered by createdAt (or id as a proxy for insertion order)
  const workouts = await prisma.workout.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, weekNumber: true },
  });

  console.log(`Found ${workouts.length} workouts`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < workouts.length; i++) {
    const workout = workouts[i];
    const newWeekNumber = Math.floor(i / WORKOUTS_PER_WEEK) + 1;

    if (workout.weekNumber === newWeekNumber) {
      console.log(`  Skip: ${workout.name} already has week ${newWeekNumber}`);
      skipped++;
      continue;
    }

    await prisma.workout.update({
      where: { id: workout.id },
      data: { weekNumber: newWeekNumber },
    });

    console.log(`  Update: ${workout.name} → Week ${newWeekNumber}`);
    updated++;
  }

  console.log(`\nDone! Updated ${updated} workouts, skipped ${skipped} (already correct).`);
}

assignWeeks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
