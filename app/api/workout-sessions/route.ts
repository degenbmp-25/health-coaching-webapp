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

    // Verify the user has access to this workout (owns it or coach assigned it)
    const workout = await db.workout.findFirst({
      where: {
        id: workoutId,
        OR: [
          { userId: user.id },
          { user: { coachId: user.id } },
        ],
      },
    })

    if (!workout) {
      return new Response("Not Found", { status: 404 })
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
