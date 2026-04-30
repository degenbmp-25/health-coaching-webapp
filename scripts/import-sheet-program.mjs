#!/usr/bin/env node
/**
 * Non-destructive Google Sheet -> Program import.
 *
 * Required env:
 *   DATABASE_URL
 *   SHEET_CSV_URL
 *   ORGANIZATION_ID or ORGANIZATION_NAME
 *   IMPORT_USER_EMAIL
 *
 * Optional env:
 *   PROGRAM_NAME
 *   DRY_RUN=true
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const SHEET_CSV_URL = process.env.SHEET_CSV_URL
const ORGANIZATION_ID = process.env.ORGANIZATION_ID
const ORGANIZATION_NAME = process.env.ORGANIZATION_NAME
const IMPORT_USER_EMAIL = process.env.IMPORT_USER_EMAIL
const PROGRAM_NAME =
  process.env.PROGRAM_NAME ||
  `Imported Sheet Program ${new Date().toISOString().slice(0, 10)}`
const DRY_RUN = process.env.DRY_RUN === "true"

const FIRST_WEEK_OFFSET = 2
const COLS_PER_WEEK = 15

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
}

function parseCSV(csv) {
  return csv.split("\n").map((line) => {
    const result = []
    let current = ""
    let inQuotes = false

    for (const char of line) {
      if (char === "\"") {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  })
}

function extractVideoUrl(notes) {
  const match = notes.match(/(?:^|[\s,;])([^\n,;]*?\.(?:MOV|MP4|HEIC))/i)
  return match ? match[1].trim() : undefined
}

function parseSetsReps(value) {
  const setsReps = value.trim()
  const setsMatch = setsReps.match(/(\d+)\s*x/i)
  const sets = setsMatch ? Number.parseInt(setsMatch[1], 10) : 1
  const repsText = setsReps
    .replace(/^\d+\s*x/i, "")
    .replace(/RM/i, " RM")
    .trim()
  const repsMatch = repsText.match(/\d+/)
  const reps = repsMatch ? Number.parseInt(repsMatch[0], 10) : 1

  return { sets, reps, repsText }
}

function parseWeight(load) {
  for (const entry of load) {
    const numeric = Number.parseFloat(entry.replace(/[^\d.-]/g, ""))
    if (!Number.isNaN(numeric)) {
      return numeric
    }
  }

  return null
}

function buildNotes(exercise) {
  return [
    exercise.repsText ? `Reps: ${exercise.repsText}` : null,
    exercise.tempo ? `Tempo: ${exercise.tempo}` : null,
    exercise.rest ? `Rest: ${exercise.rest}` : null,
    exercise.notes || null,
  ]
    .filter(Boolean)
    .join(" | ")
}

async function fetchSheetWorkouts() {
  const response = await fetch(SHEET_CSV_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet CSV: ${response.status}`)
  }

  const data = parseCSV(await response.text())
  const workouts = []
  let currentWorkout = null
  let currentCategory = ""

  function parseExercise(row, weekOffset, category) {
    const firstCell = (row[0] || "").trim()
    const exerciseName = (row[1] || "").trim()
    if (!["I", "II", "III", "IV"].includes(firstCell) || !exerciseName) {
      return null
    }

    const setsReps = row[weekOffset] || ""
    if (!setsReps.trim()) {
      return null
    }

    const { sets, reps, repsText } = parseSetsReps(setsReps)
    const loadStart = weekOffset + 1
    const load = [
      row[loadStart],
      row[loadStart + 1],
      row[loadStart + 2],
      row[loadStart + 3],
      row[loadStart + 4],
      row[loadStart + 5],
    ].filter((value) => value && value.trim())

    const tempo = row[weekOffset + 7] || ""
    const rest = row[weekOffset + 8] || ""
    const notes = row[weekOffset + 9] || ""

    return {
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
    }
  }

  for (const row of data) {
    const firstCell = (row[0] || "").trim()

    if (firstCell.startsWith("Workout") && firstCell.includes("(")) {
      if (currentWorkout) {
        workouts.push(currentWorkout)
      }
      currentWorkout = {
        name: firstCell.replace(",", "").trim(),
        weekExercises: [[], [], [], [], []],
      }
      continue
    }

    if (!currentWorkout) {
      continue
    }

    if (
      firstCell === "#" &&
      row[1] &&
      (row[1].includes("Movement Prep") ||
        row[1].includes("Elasticity") ||
        row[1].includes("Resistance") ||
        row[1].includes("Metabolic"))
    ) {
      currentCategory = row[1]
      continue
    }

    if (
      !row[1] ||
      !row[1].trim() ||
      firstCell.startsWith("RST=") ||
      firstCell.startsWith("BB=") ||
      firstCell.startsWith("HK=") ||
      firstCell.startsWith("General notes")
    ) {
      continue
    }

    for (let week = 0; week < 5; week += 1) {
      const exercise = parseExercise(
        row,
        FIRST_WEEK_OFFSET + week * COLS_PER_WEEK,
        currentCategory
      )
      if (exercise) {
        currentWorkout.weekExercises[week].push(exercise)
      }
    }
  }

  if (currentWorkout) {
    workouts.push(currentWorkout)
  }

  return workouts
}

async function main() {
  requireEnv("DATABASE_URL", process.env.DATABASE_URL)
  requireEnv("SHEET_CSV_URL", SHEET_CSV_URL)
  requireEnv("IMPORT_USER_EMAIL", IMPORT_USER_EMAIL)
  if (!ORGANIZATION_ID && !ORGANIZATION_NAME) {
    throw new Error("Missing required env var: ORGANIZATION_ID or ORGANIZATION_NAME")
  }

  const rawWorkouts = await fetchSheetWorkouts()
  const weekWorkoutCount = rawWorkouts.reduce(
    (total, workout) =>
      total + workout.weekExercises.filter((exercises) => exercises.length).length,
    0
  )
  const exerciseCount = rawWorkouts.reduce(
    (total, workout) =>
      total +
      workout.weekExercises.reduce((weekTotal, exercises) => weekTotal + exercises.length, 0),
    0
  )

  const organization = await prisma.organization.findFirst({
    where: ORGANIZATION_ID ? { id: ORGANIZATION_ID } : { name: ORGANIZATION_NAME },
  })
  if (!organization) {
    throw new Error("Organization not found")
  }

  const importUser = await prisma.user.findUnique({
    where: { email: IMPORT_USER_EMAIL },
  })
  if (!importUser) {
    throw new Error("Import user not found")
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: importUser.id,
      },
    },
  })
  if (!membership || !["owner", "trainer"].includes(membership.role)) {
    throw new Error("Import user must be an owner or trainer in the organization")
  }

  const existingProgram = await prisma.program.findFirst({
    where: {
      organizationId: organization.id,
      name: PROGRAM_NAME,
    },
  })
  if (existingProgram) {
    throw new Error(`Program already exists: ${PROGRAM_NAME}`)
  }

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        organization: { id: organization.id, name: organization.name },
        importUser: { id: importUser.id, email: importUser.email },
        programName: PROGRAM_NAME,
        baseWorkouts: rawWorkouts.length,
        weekWorkouts: weekWorkoutCount,
        exercises: exerciseCount,
      },
      null,
      2
    )
  )

  if (DRY_RUN) {
    return
  }

  const program = await prisma.program.create({
    data: {
      name: PROGRAM_NAME,
      description: `Imported from Google Sheet on ${new Date().toISOString().slice(0, 10)}`,
      organizationId: organization.id,
      createdById: importUser.id,
      totalWeeks: 5,
    },
  })

  for (let workoutIndex = 0; workoutIndex < rawWorkouts.length; workoutIndex += 1) {
    const rawWorkout = rawWorkouts[workoutIndex]

    for (let week = 0; week < rawWorkout.weekExercises.length; week += 1) {
      const exercises = rawWorkout.weekExercises[week]
      if (!exercises.length) {
        continue
      }

      const workout = await prisma.workout.create({
        data: {
          name: `${rawWorkout.name} - Week ${week + 1}`,
          userId: importUser.id,
          programId: program.id,
          weekNumber: week + 1,
          dayOfWeek: Math.min(workoutIndex + 1, 6),
        },
      })

      for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
        const sheetExercise = exercises[exerciseIndex]
        const exercise = await prisma.exercise.upsert({
          where: {
            id: `${program.id}-${week + 1}-${workoutIndex + 1}-${exerciseIndex + 1}`,
          },
          update: {
            name: sheetExercise.name,
            category: sheetExercise.category || "General",
          },
          create: {
            id: `${program.id}-${week + 1}-${workoutIndex + 1}-${exerciseIndex + 1}`,
            name: sheetExercise.name,
            category: sheetExercise.category || "General",
            muscleGroup: "Unknown",
            userId: importUser.id,
          },
        })

        await prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.id,
            sets: sheetExercise.sets,
            reps: sheetExercise.reps,
            weight: parseWeight(sheetExercise.load),
            notes: buildNotes(sheetExercise) || null,
            videoUrl: sheetExercise.videoUrl || null,
            order: exerciseIndex,
          },
        })
      }
    }
  }

  console.log(`Imported program ${program.name} (${program.id})`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
