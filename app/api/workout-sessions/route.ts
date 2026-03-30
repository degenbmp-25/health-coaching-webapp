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

    if (!isOwner && !isAssignedToProgram) {
      return new Response("Forbidden", { status: 403 })
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
      return Response.json(existing)
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

    return Response.json(session, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
