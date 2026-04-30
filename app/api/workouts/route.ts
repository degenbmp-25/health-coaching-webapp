import { z } from "zod"
import type { Prisma } from "@prisma/client"

import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const PROGRAM_WORKOUT_ORDER: Prisma.WorkoutOrderByWithRelationInput[] = [
  { weekNumber: "asc" },
  { dayOfWeek: "asc" },
  { createdAt: "asc" },
]

const workoutCreateSchema = z.object({
  name: z.string().min(3, {
    message: "Workout name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  weekNumber: z.number().int().min(1).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  scheduledDate: z.string().datetime().optional().nullable(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      sets: z.number().min(1),
      reps: z.number().min(1),
      weight: z.number().optional(),
      notes: z.string().optional(),
      order: z.number(),
    })
  ).optional(),
})

// GET /api/workouts — list all workouts available to the current user
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Get user's organization memberships
    const memberships = await db.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true, role: true },
    })

    // If no org membership, fall back to legacy behavior (own workouts only)
    if (memberships.length === 0) {
      const workouts = await db.workout.findMany({
        where: { userId: user.id },
        include: {
          exercises: {
            include: {
              exercise: {
                select: { id: true, name: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: PROGRAM_WORKOUT_ORDER,
      })
      return Response.json(workouts)
    }

    // Get all programs in user's organizations
    const orgIds = memberships.map((m) => m.organizationId)
    const programs = await db.program.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true },
    })
    const programIds = programs.map((p) => p.id)

    // If user is a trainer/owner, get all workouts from org programs
    // If user is a client, get workouts from assigned programs
    const isTrainerOrOwner = memberships.some((m) => m.role === "owner" || m.role === "trainer")

    let workouts
    if (isTrainerOrOwner) {
      // Get all workouts from org programs + user's own workouts
      workouts = await db.workout.findMany({
        where: {
          OR: [
            { userId: user.id },
            { programId: { in: programIds } },
          ],
        },
        include: {
          exercises: {
            include: {
              exercise: {
                select: { id: true, name: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: PROGRAM_WORKOUT_ORDER,
      })
    } else {
      // Client: get workouts from assigned programs only
      const assignments = await db.programAssignment.findMany({
        where: { clientId: user.id },
        select: { programId: true },
      })
      const assignedProgramIds = assignments.map((a) => a.programId)

      workouts = await db.workout.findMany({
        where: {
          programId: { in: assignedProgramIds },
        },
        include: {
          exercises: {
            include: {
              exercise: {
                select: { id: true, name: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: PROGRAM_WORKOUT_ORDER,
      })
    }

    return Response.json(workouts)
  } catch (error) {
    console.error("Error listing workouts:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// POST /api/workouts — create a new workout
export async function POST(req: Request) {
  try {
    // Ensure user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Get the request body and validate it.
    const json = await req.json()
    const body = workoutCreateSchema.parse(json)

    // Create the workout
    const workout = await db.workout.create({
      data: {
        name: body.name,
        description: body.description,
        weekNumber: body.weekNumber,
        dayOfWeek: body.dayOfWeek,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        userId: user.id,
        ...(body.exercises && body.exercises.length > 0 && {
          exercises: {
            create: body.exercises.map((exercise) => ({
              exerciseId: exercise.exerciseId,
              sets: exercise.sets,
              reps: exercise.reps,
              weight: exercise.weight,
              notes: exercise.notes,
              order: exercise.order,
            })),
          },
        })
      },
      include: {
        exercises: true,
      }
    })

    return new Response(JSON.stringify(workout))
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log the specific validation errors
      console.error("Workout creation validation error:", JSON.stringify(error.issues, null, 2));
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    // Log other errors
    console.error("Error creating workout:", error);
    return new Response(null, { status: 500 })
  }
}
