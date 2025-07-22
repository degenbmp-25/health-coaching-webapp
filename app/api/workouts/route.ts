import { z } from "zod"

import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const workoutCreateSchema = z.object({
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
    })
  ).optional(),
})

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