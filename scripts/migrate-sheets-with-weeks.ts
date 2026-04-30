#!/usr/bin/env npx tsx
/**
 * Migration Script: Google Sheets → Neon Database (WITH WEEK SUPPORT)
 * 
 * Parses weeks as horizontal column groups.
 * "Workout A (Legs 1)" has Week 1, Week 2, Week 3, Week 4, Week 5 columns.
 * Each week becomes a separate workout entry with weekNumber set.
 * 
 * Usage:
 *   npx tsx scripts/migrate-sheets-with-weeks.ts
 */

import { PrismaClient } from '@prisma/client';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSC1zuoJ5orO_jtqeFtCjbO-IUXMXhTe1tcx2REMppG_MIOTCpDWUQsq65Ds1_SXX_oYkqVjQsByTpW/pub?output=csv';

const prisma = new PrismaClient();

const ORGANIZATION_NAME = 'Habithletics Gym';
const PROGRAM_NAME = 'Strength & Conditioning';

// Exercise name is in column 1. Each week then starts at column 2 and spans
// 15 CSV columns: Sets/Reps, Load x6, Tempo, Rest, Notes, then spacer cells.
const FIRST_WEEK_OFFSET = 2;
const COLS_PER_WEEK = 15;

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  repsText: string;
  tempo: string;
  rest: string;
  load: string[];
  notes: string;
  videoUrl?: string;
  category?: string;
}

interface RawWorkout {
  name: string;
  weekExercises: Exercise[][];  // Array of exercise arrays, one per week
}

function parseCSV(csv: string): string[][] {
  const lines = csv.split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function extractVideoUrl(notes: string): string | undefined {
  // Look for a file/path that ends in a supported media extension.
  // Sheet notes often include spaces or folders, e.g. "book opener.MOV" or "SMR trap/shoulder.MOV".
  const match = notes.match(/(?:^|[\s,;])([^\n,;]*?\.(?:MOV|MP4|HEIC))/i);
  return match ? match[1].trim() : undefined;
}

function parseSetsReps(value: string): { sets: number; reps: number; repsText: string } {
  const setsReps = value.trim();
  const setsMatch = setsReps.match(/(\d+)\s*x/i);
  const sets = setsMatch ? parseInt(setsMatch[1], 10) : 1;
  const repsText = setsReps.replace(/^\d+\s*x/i, '').replace(/RM/i, ' RM').trim();
  const repsMatch = repsText.match(/\d+/);
  const reps = repsMatch ? parseInt(repsMatch[0], 10) : 1;

  return { sets, reps, repsText };
}

function parseWeight(load: string[]): number | null {
  for (const entry of load) {
    const numeric = parseFloat(entry.replace(/[^\d.-]/g, ''));
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }

  return null;
}

async function fetchSheetData(): Promise<RawWorkout[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(SHEET_CSV_URL, { signal: controller.signal });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  const csv = await response.text();
  const data = parseCSV(csv);

  const workouts: RawWorkout[] = [];
  let currentWorkout: { name: string; weekExercises: Exercise[][] } | null = null;
  let currentCategory = '';
  let exerciseCounter = 0;
  let rowIndex = 0;

  // Find the row index where exercises start for a given week
  // We need to track which column offset to use for each week

  function parseExercise(row: string[], weekOffset: number, category: string): Exercise | null {
    const firstCell = (row[0] || '').trim();
    const exerciseName = (row[1] || '').trim();
    if (!['I', 'II', 'III', 'IV'].includes(firstCell)) return null;
    if (!row[1] || row[1].trim() === '') return null;

    const setsReps = row[weekOffset] || '';
    if (!setsReps.trim()) return null;
    const { sets, reps, repsText } = parseSetsReps(setsReps);

    // Load columns: +1 through +6 in each week group
    const loadStart = weekOffset + 1;
    const load = [row[loadStart], row[loadStart + 1], row[loadStart + 2], row[loadStart + 3], row[loadStart + 4], row[loadStart + 5]]
      .filter(l => l && l.trim());

    const tempo = row[weekOffset + 7] || '';
    const rest = row[weekOffset + 8] || '';
    const notes = row[weekOffset + 9] || '';

    return {
      id: `e${++exerciseCounter}`,
      name: exerciseName,
      sets,
      reps,
      repsText,
      tempo,
      rest,
      load,
      notes,
      videoUrl: extractVideoUrl(notes),
      category,
    };
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const firstCell = (row[0] || '').trim();

    // Detect workout headers
    if (firstCell.startsWith('Workout') && firstCell.includes('(')) {
      if (currentWorkout) {
        workouts.push(currentWorkout);
      }
      currentWorkout = { 
        name: firstCell.replace(',', '').trim(),
        weekExercises: [[], [], [], [], []]  // 5 weeks
      };
      continue;
    }

    if (!currentWorkout) continue;

    // Detect category headers
    if (firstCell === '#' && row[1] && 
        (row[1].includes('Movement Prep') || 
         row[1].includes('Elasticity') || 
         row[1].includes('Resistance') || 
         row[1].includes('Metabolic'))) {
      currentCategory = row[1];
      continue;
    }

    // Skip meta rows and empty rows
    if (!row[1] || row[1].trim() === '' || firstCell.startsWith('RST=') || 
        firstCell.startsWith('BB=') || firstCell.startsWith('HK=') ||
        firstCell.startsWith('General notes')) {
      continue;
    }

    // Skip the header row (#,Movement Prep,Sets/Reps,Load...)
    if (firstCell === '#' && row[1] === 'Movement Prep') {
      continue;
    }

    // Parse exercise for each week
    for (let week = 0; week < 5; week++) {
      const weekOffset = FIRST_WEEK_OFFSET + week * COLS_PER_WEEK;
      const exercise = parseExercise(row, weekOffset, currentCategory);
      if (exercise) {
        currentWorkout.weekExercises[week].push(exercise);
      }
    }
  }

  if (currentWorkout) {
    workouts.push(currentWorkout);
  }

  return workouts;
}

async function migrate() {
  console.log('Fetching sheet data...');
  const rawWorkouts = await fetchSheetData();

  console.log(`Found ${rawWorkouts.length} workouts with week data`);

  // Create/find organization
  let org = await prisma.organization.findFirst({ where: { name: ORGANIZATION_NAME } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: ORGANIZATION_NAME, type: 'gym' }
    });
    console.log(`Created org: ${org.name}`);
  } else {
    console.log(`Org exists: ${org.name}`);
  }

  // Create/find system user for migrated workouts
  let systemUser = await prisma.user.findFirst({ 
    where: { email: 'system@habithletics.app' }
  });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        clerkId: 'system_migrated',
        email: 'system@habithletics.app',
        name: 'System (Migrated)',
        role: 'user',
        organizationRole: 'owner',
      }
    });
    console.log(`Created system user: ${systemUser.email}`);
  } else {
    console.log(`System user exists: ${systemUser.email}`);
  }

  const existingMembership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: org.id,
      userId: systemUser.id,
    },
  });

  if (!existingMembership) {
    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: systemUser.id,
        role: 'owner',
      },
    });
  }

  // Create/find program
  let program = await prisma.program.findFirst({ 
    where: { name: PROGRAM_NAME, organizationId: org.id }
  });
  if (!program) {
    program = await prisma.program.create({
      data: {
        name: PROGRAM_NAME,
        organizationId: org.id,
        createdById: systemUser.id,
        totalWeeks: 5,
      }
    });
    console.log(`Created program: ${program.name}`);
  } else {
    program = await prisma.program.update({
      where: { id: program.id },
      data: {
        createdById: program.createdById || systemUser.id,
        totalWeeks: program.totalWeeks || 5,
      },
    });
    console.log(`Program exists: ${program.name}`);
  }

  // Delete existing workouts to re-import cleanly
  const existingWorkouts = await prisma.workout.findMany({
    where: { programId: program.id },
    include: { exercises: true }
  });
  
  console.log(`Deleting ${existingWorkouts.length} existing workouts...`);
  for (const w of existingWorkouts) {
    await prisma.workoutExercise.deleteMany({ where: { workoutId: w.id } });
  }
  await prisma.workout.deleteMany({ where: { programId: program.id } });

  // Import each workout with week variants
  let workoutCount = 0;
  let exerciseCount = 0;

  for (const rawWorkout of rawWorkouts) {
    for (let week = 0; week < 5; week++) {
      const exercises = rawWorkout.weekExercises[week];
      if (exercises.length === 0) continue;  // Skip empty weeks

      const workout = await prisma.workout.create({
        data: {
          name: `${rawWorkout.name} - Week ${week + 1}`,
          userId: systemUser.id,
          programId: program.id,
          weekNumber: week + 1,
          dayOfWeek: 1,  // Default
        }
      });

      // Create exercises
      for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
        const ex = exercises[exerciseIndex];
        const exercise = await prisma.exercise.upsert({
          where: {
            id: ex.id,
          },
          update: {
            name: ex.name,
            category: ex.category || 'General',
          },
          create: {
            id: ex.id,
            name: ex.name,
            category: ex.category || 'General',
            muscleGroup: 'Unknown',
            userId: systemUser.id,
          },
        });
        const noteParts = [
          ex.repsText ? `Reps: ${ex.repsText}` : null,
          ex.tempo ? `Tempo: ${ex.tempo}` : null,
          ex.rest ? `Rest: ${ex.rest}` : null,
          ex.notes || null,
        ].filter(Boolean);

        await prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.id,
            sets: ex.sets,
            reps: ex.reps,
            weight: parseWeight(ex.load),
            notes: noteParts.join(' | ') || null,
            videoUrl: ex.videoUrl,
            order: exerciseIndex,
          }
        });
        exerciseCount++;
      }

      workoutCount++;
      console.log(`  Created: ${workout.name} - Week ${week + 1} (${exercises.length} exercises)`);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`  ${workoutCount} workouts created`);
  console.log(`  ${exerciseCount} exercises created`);
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
