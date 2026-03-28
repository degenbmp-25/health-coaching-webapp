import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { queueSyncJob } from "@/lib/sync-service"

const routeContextSchema = z.object({
  params: z.object({
    sessionId: z.string(),
  }),
})

const patchSessionSchema = z.object({
  status: z.enum(["in_progress", "completed"]).optional(),
  notes: z.string().optional(),
})

type RouteContext = z.infer<typeof routeContextSchema>

// PATCH /api/workout-sessions/[sessionId] — update session (including notes)
export async function PATCH(
  req: Request,
  context: RouteContext
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const session = await db.workoutSession.findFirst({
      where: { id: params.sessionId, userId: user.id },
    })

    if (!session) {
      return new Response("Not Found", { status: 404 })
    }

    const json = await req.json()
    const body = patchSessionSchema.parse(json)

    const updateData: any = {}

    if (body.status !== undefined) {
      updateData.status = body.status
      updateData.completedAt = body.status === "completed" ? new Date() : null
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes
    }

    const updated = await db.workoutSession.update({
      where: { id: params.sessionId },
      data: updateData,
      include: {
        setLogs: {
          include: {
            workoutExercise: {
              include: {
                exercise: true,
              },
            },
          },
        },
        workout: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Trigger sheet sync when session is completed
    if (body.status === "completed") {
      try {
        // Fire and forget - don't block the response
        queueSyncJob(params.sessionId).catch((err) => {
          console.error("Background sync failed:", err)
        })
      } catch (syncError) {
        // Log but don't fail the request
        console.error("Failed to queue sync job:", syncError)
      }
    }

    return Response.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}

// GET /api/workout-sessions/[sessionId] — get session details
export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const session = await db.workoutSession.findFirst({
      where: {
        id: params.sessionId,
        OR: [
          { userId: user.id },
          { workout: { userId: user.id } },
          { user: { coachId: user.id } },
        ],
      },
      include: {
        setLogs: {
          include: {
            workoutExercise: {
              include: {
                exercise: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
          },
          orderBy: [
            { workoutExerciseId: "asc" },
            { setNumber: "asc" },
          ],
        },
        workout: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: { order: "asc" },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!session) {
      return new Response("Not Found", { status: 404 })
    }

    return Response.json(session)
  } catch (error) {
    console.error("Error fetching session:", error)
    return new Response(null, { status: 500 })
  }
}
