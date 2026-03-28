import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { triggerSync } from "@/lib/sync-service"

const routeContextSchema = z.object({
  params: z.object({
    sessionId: z.string(),
  }),
})

type RouteContext = z.infer<typeof routeContextSchema>

// POST /api/sheets/sync/:sessionId - Trigger manual sync for a session
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

    // Get the session and verify access
    const session = await db.workoutSession.findUnique({
      where: { id: params.sessionId },
      include: {
        user: {
          select: {
            primaryTrainerId: true,
          },
        },
        workout: {
          select: {
            userId: true,
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    // Check if user has access (client who did workout, or their trainer)
    const isClient = session.userId === user.id
    const isTrainer = session.user.primaryTrainerId === user.id || session.workout.userId === user.id

    if (!isClient && !isTrainer) {
      return new Response("Forbidden", { status: 403 })
    }

    // Get access token from request body (for manual sync with OAuth)
    const body = await req.json().catch(() => ({}))
    const accessToken = body.accessToken as string | undefined

    // Trigger the sync
    const result = await triggerSync(params.sessionId, accessToken)

    if (!result.success) {
      return NextResponse.json(result, { status: 500 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error syncing session:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
