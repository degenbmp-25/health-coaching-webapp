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
      muxPlaybackId: z.string().optional().nullable(),
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

    // Fetch workout with program for multi-tenant auth check
    const workout = await db.workout.findFirst({
      where: { id: params.workoutId },
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

    // Check authorization: user owns workout OR is assigned to the program
    const isOwner = workout.userId === user.id
    const isAssignedToProgram = workout.program?.assignments &&
      workout.program.assignments.length > 0

    if (!isOwner && !isAssignedToProgram) {
      return new Response("Forbidden", { status: 403 })
    }

    // Build update data, filtering out undefined values
    const updateData: Record<string, any> = {
      name: body.name,
      description: body.description,
      weekNumber: body.weekNumber,
      dayOfWeek: body.dayOfWeek,
      exercises: {
        deleteMany: {},
        create: body.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          notes: exercise.notes,
          order: exercise.order,
          muxPlaybackId: exercise.muxPlaybackId,
        })),
      },
    }

    // Handle scheduledDate explicitly: only include if explicitly set (not undefined)
    if (body.scheduledDate !== undefined) {
      updateData.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null
    }

    // Update the workout
    await db.workout.update({
      where: {
        id: params.workoutId,
      },
      data: updateData,
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

    // Fetch workout with program for multi-tenant auth check
    const workout = await db.workout.findFirst({
      where: { id: params.workoutId },
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

    // Check authorization: user owns workout OR is a trainer/owner in the org
    const isOwner = workout.userId === user.id

    // Check if user is a TRAINER or OWNER in the organization (not just a client)
    let isTrainerOrOwner = false
    if (workout.program?.organizationId) {
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          organizationId: workout.program.organizationId,
          role: { in: ["owner", "trainer"] },
        },
      })
      isTrainerOrOwner = !!membership
    }

    if (!isOwner && !isTrainerOrOwner) {
      return new Response("Forbidden", { status: 403 })
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
