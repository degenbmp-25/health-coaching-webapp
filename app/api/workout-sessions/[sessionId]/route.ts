import { z } from "zod"

import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    sessionId: z.string(),
  }),
})

const patchSessionSchema = z.object({
  status: z.enum(["in_progress", "completed"]),
})

// PATCH /api/workout-sessions/[sessionId] — mark session complete
export async function PATCH(
  req: Request,
  context: z.infer<typeof routeContextSchema>
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
    const { status } = patchSessionSchema.parse(json)

    const updated = await db.workoutSession.update({
      where: { id: params.sessionId },
      data: {
        status,
        completedAt: status === "completed" ? new Date() : null,
      },
    })

    return Response.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
