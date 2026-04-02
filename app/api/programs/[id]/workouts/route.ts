import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

const createWorkoutSchema = z.object({
  name: z.string().min(3, {
    message: "Workout name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  weekNumber: z.number().int().min(1).max(52).optional().nullable(),
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

type RouteContext = z.infer<typeof routeContextSchema>

// POST /api/programs/:id/workouts - Create a workout within a program
export async function POST(
  req: Request,
  context: RouteContext
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Get the program and verify access
    const program = await db.program.findUnique({
      where: { id: params.id },
      include: { organization: true },
    })

    if (!program) {
      return new Response("Not Found", { status: 404 })
    }

    // Check if user is an owner or trainer
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: program.organizationId,
          userId: user.id,
        },
      },
    })

    if (!membership || (membership.role !== "owner" && membership.role !== "trainer")) {
      return new Response("Forbidden", { status: 403 })
    }

    const json = await req.json()
    const body = createWorkoutSchema.parse(json)

    // Create the workout within the program
    const workout = await db.workout.create({
      data: {
        name: body.name,
        description: body.description,
        weekNumber: body.weekNumber,
        dayOfWeek: body.dayOfWeek,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        userId: user.id,
        programId: params.id,
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
        exercises: {
          include: {
            exercise: {
              select: { id: true, name: true, category: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })

    return NextResponse.json(workout, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error creating workout in program:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
