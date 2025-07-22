import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import * as z from "zod"

import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    mealId: z.string(),
  }),
})

const mealPatchSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
})

export async function DELETE(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)

    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    // Verify user owns this meal
    const meal = await db.meal.findFirst({
      where: {
        id: params.mealId,
        userId: currentUser.id,
      },
    })

    if (!meal) {
      return new Response(null, { status: 404 })
    }

    // Delete the meal
    await db.meal.delete({
      where: {
        id: params.mealId,
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

export async function PATCH(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    const json = await req.json()
    const body = mealPatchSchema.parse(json)

    await db.meal.update({
      where: {
        id: params.mealId,
      },
      data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        calories: body.calories,
        protein: body.protein,
        carbs: body.carbs,
        fat: body.fat,
        date: body.date,
      },
    })

    return new Response(null, { status: 200 })
  } catch (error) {
    console.error("Meal update error:", error)
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 })
    }
    return new Response(null, { status: 500 })
  }
} 