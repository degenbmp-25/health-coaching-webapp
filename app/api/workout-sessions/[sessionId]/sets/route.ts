import { z } from "zod"

import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    sessionId: z.string(),
  }),
})

const setLogSchema = z.object({
  workoutExerciseId: z.string(),
  setNumber: z.number().int().min(0),
  weight: z.number().nullable().optional(),
  reps: z.number().int().nullable().optional(),
  completed: z.boolean(),
})

const putSetsSchema = z.object({
  sets: z.array(setLogSchema),
})

// PUT /api/workout-sessions/[sessionId]/sets — upsert set logs in batch
export async function PUT(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)

    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Verify session ownership
    const session = await db.workoutSession.findFirst({
      where: { id: params.sessionId, userId: user.id },
    })

    if (!session) {
      return new Response("Not Found", { status: 404 })
    }

    const json = await req.json()
    const { sets } = putSetsSchema.parse(json)

    // Upsert all set logs in a transaction
    await db.$transaction(
      sets.map((set) =>
        db.setLog.upsert({
          where: {
            sessionId_workoutExerciseId_setNumber: {
              sessionId: params.sessionId,
              workoutExerciseId: set.workoutExerciseId,
              setNumber: set.setNumber,
            },
          },
          create: {
            sessionId: params.sessionId,
            workoutExerciseId: set.workoutExerciseId,
            setNumber: set.setNumber,
            weight: set.weight ?? null,
            reps: set.reps ?? null,
            completed: set.completed,
          },
          update: {
            weight: set.weight ?? null,
            reps: set.reps ?? null,
            completed: set.completed,
          },
        })
      )
    )

    return new Response(null, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
}
