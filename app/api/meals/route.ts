import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

const mealCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  date: z.string(),
})

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    
    if (user instanceof NextResponse) {
      return user
    }

    const json = await req.json()
    const body = mealCreateSchema.parse(json)

    const meal = await db.meal.create({
      data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        calories: body.calories,
        protein: body.protein,
        carbs: body.carbs,
        fat: body.fat,
        date: new Date(body.date),
        userId: user.id,
      },
    })

    return NextResponse.json(meal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse("Internal Error", { status: 500 })
  }
} 