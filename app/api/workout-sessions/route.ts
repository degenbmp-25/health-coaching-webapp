import { z } from "zod"

import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const createSessionSchema = z.object({
  workoutId: z.string(),
})

// POST /api/workout-sessions — create or resume a session for a workout
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const { workoutId } = createSessionSchema.parse(json)

    // Fetch the workout with its program assignments
    const workout = await db.workout.findFirst({
      where: {
        id: workoutId,
      },
      include: {
        exercises: {
          select: {
            id: true,
            exerciseId: true,
            sets: true,
          },
        },
        user: {
          select: {
            organizationMemberships: {
              select: { organizationId: true },
            },
          },
        },
        program: {
          include: {
            assignments: {
              where: { clientId: user.id },
              select: { id: true },
            },
          },
        },
      },
    })

    if (!workout) {
      return new Response("Not Found", { status: 404 })
    }

    // Check authorization: user owns the workout OR is assigned to the program
    const isOwner = workout.userId === user.id
    const isAssignedToProgram = workout.program?.assignments &&
      workout.program.assignments.length > 0
    const workoutOrgIds = workout.program?.organizationId
      ? [workout.program.organizationId]
      : workout.user.organizationMemberships.map((membership) => membership.organizationId)
    const canManageOrgWorkout = workoutOrgIds.length > 0
      ? await db.organizationMember.findFirst({
          where: {
            userId: user.id,
            organizationId: { in: workoutOrgIds },
            role: { in: ["owner", "trainer", "coach"] },
          },
          select: { id: true },
        })
      : null

    if (!isOwner && !isAssignedToProgram && !canManageOrgWorkout) {
      return new Response("Forbidden", { status: 403 })
    }

    const getPreviousSetLogs = async () => {
      const exerciseIds = Array.from(
        new Set(workout.exercises.map((exercise) => exercise.exerciseId))
      )

      if (exerciseIds.length === 0) {
        return []
      }

      const previousLogs = await db.setLog.findMany({
        where: {
          completed: true,
          workoutExercise: {
            exerciseId: { in: exerciseIds },
          },
          session: {
            userId: user.id,
            status: "completed",
          },
        },
        include: {
          session: {
            select: {
              id: true,
              completedAt: true,
              workoutId: true,
              workout: {
                select: { name: true },
              },
            },
          },
          workoutExercise: {
            select: {
              exerciseId: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      })

      const currentExercisesByExerciseId = new Map<string, typeof workout.exercises>()
      for (const exercise of workout.exercises) {
        const existing = currentExercisesByExerciseId.get(exercise.exerciseId) || []
        currentExercisesByExerciseId.set(exercise.exerciseId, [...existing, exercise])
      }

      const previousByCurrentSet = new Map<string, any>()
      for (const log of previousLogs) {
        const matchingExercises = currentExercisesByExerciseId.get(log.workoutExercise.exerciseId) || []
        for (const currentExercise of matchingExercises) {
          if (log.setNumber >= currentExercise.sets) continue

          const key = `${currentExercise.id}_${log.setNumber}`
          if (previousByCurrentSet.has(key)) continue

          previousByCurrentSet.set(key, {
            workoutExerciseId: currentExercise.id,
            setNumber: log.setNumber,
            weight: log.weight,
            reps: log.reps,
            completedAt: log.session.completedAt,
            workoutName: log.session.workout.name,
          })
        }
      }

      return Array.from(previousByCurrentSet.values())
    }

    // Resume existing in-progress session if one exists
    const existing = await db.workoutSession.findFirst({
      where: {
        workoutId,
        userId: user.id,
        status: "in_progress",
      },
      include: {
        setLogs: true,
      },
      orderBy: { startedAt: "desc" },
    })

    if (existing) {
      return Response.json({
        ...existing,
        previousSetLogs: await getPreviousSetLogs(),
      })
    }

    // Create a new session
    const session = await db.workoutSession.create({
      data: {
        workoutId,
        userId: user.id,
        status: "in_progress",
      },
      include: {
        setLogs: true,
      },
    })

    return Response.json({
      ...session,
      previousSetLogs: await getPreviousSetLogs(),
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
