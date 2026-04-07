import { z } from "zod"

import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    workoutId: z.string(),
  }),
})

const workoutPatchSchema = z.object({
  name: z.string().min(3, {
    message: "Workout name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      sets: z.number().min(1),
      reps: z.number().min(1),
      weight: z.number().optional(),
      notes: z.string().optional(),
      order: z.number(),
      organizationVideoId: z.string().optional(),
    })
  ),
})

export async function PATCH(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    // Validate the route context.
    const { params } = routeContextSchema.parse(context)

    // Ensure user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Get the request body and validate it.
    const json = await req.json()
    const body = workoutPatchSchema.parse(json)

    // Verify user owns the workout OR is the coach of the workout owner
    const workout = await db.workout.findFirst({
      where: {
        id: params.workoutId,
        OR: [
          // User owns the workout
          { userId: user.id },
          // User is a coach and the workout belongs to their student
          {
            user: {
              coachId: user.id,
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            coachId: true,
          }
        }
      }
    })

    if (!workout) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Resolve organizationVideoIds to muxPlaybackIds before saving
    type ExerciseWithMux = {
      exerciseId: string
      sets: number
      reps: number
      weight?: number
      notes?: string
      order: number
      organizationVideoId?: string
      muxPlaybackId?: string | null
    }
    let exercisesWithVideo: ExerciseWithMux[] = body.exercises
    if (body.exercises.some((e) => e.organizationVideoId)) {
      const videoIds = body.exercises
        .map((e) => e.organizationVideoId)
        .filter(Boolean) as string[]

      const videos = await db.organizationVideo.findMany({
        where: { id: { in: videoIds } },
        select: { id: true, muxPlaybackId: true },
      })

      const videoMap = new Map(videos.map((v) => [v.id, v.muxPlaybackId]))

      exercisesWithVideo = body.exercises.map((e) => ({
        ...e,
        muxPlaybackId: e.organizationVideoId ? videoMap.get(e.organizationVideoId) ?? null : undefined,
      })) as ExerciseWithMux[]
    }

    // Update the workout
    await db.workout.update({
      where: {
        id: params.workoutId,
      },
      data: {
        name: body.name,
        description: body.description,
        exercises: {
          deleteMany: {},
          create: exercisesWithVideo.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            notes: exercise.notes,
            order: exercise.order,
            muxPlaybackId: exercise.muxPlaybackId ?? null,
          })),
        },
      },
    })

    return new Response(null, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)

    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Verify user owns the workout OR is the coach of the workout owner
    const workout = await db.workout.findFirst({
      where: {
        id: params.workoutId,
        OR: [
          { userId: user.id },
          {
            user: {
              coachId: user.id,
            },
          },
        ],
      },
    })

    if (!workout) {
      return new Response("Unauthorized", { status: 403 })
    }

    await db.workout.delete({
      where: {
        id: params.workoutId,
      },
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}