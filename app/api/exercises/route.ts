import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { getExercises } from "@/lib/api/workouts"
import { z } from "zod"

const exerciseCreateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  category: z.string().min(1),
  muscleGroup: z.string().min(1),
  equipment: z.string().optional(),
  // userId is added server-side based on session
})

export async function POST(req: Request) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session;
    const currentUser = session;

    const json = await req.json()
    const body = exerciseCreateSchema.parse(json)

    const exercise = await db.exercise.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        muscleGroup: body.muscleGroup,
        equipment: body.equipment,
        userId: currentUser.id, // Link to the user creating it
      },
    })

    return NextResponse.json(exercise, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 422 })
    }
    console.error("[EXERCISES_POST]", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const authRes = await requireAuth();
    const currentUser = authRes instanceof NextResponse ? null : authRes;

    const exercises = await getExercises(currentUser?.id)

    return NextResponse.json(exercises)
  } catch (error) {
    console.error("[EXERCISES_GET]", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
