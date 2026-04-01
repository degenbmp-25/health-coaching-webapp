import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"

import { db } from "@/lib/db"
import { resolveClerkIdToDbUserId } from "@/lib/api/id-utils"

const mealCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
})

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;
    const currentUser = session;

    // Resolve params.userId (Clerk ID) to DB user ID
    const targetDbUserId = await resolveClerkIdToDbUserId(params.userId)
    if (!targetDbUserId) {
      return new NextResponse("User not found", { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get("date")
    const date = dateParam ? new Date(dateParam) : undefined
    
    // If the user is looking at their own meals
    if (currentUser.id === targetDbUserId) {
      const meals = await db.meal.findMany({
        where: {
          userId: targetDbUserId,
          ...(date && {
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lt: new Date(date.setHours(23, 59, 59, 999)),
            },
          }),
        },
        orderBy: {
          date: "desc",
        },
      })
      
      return NextResponse.json(meals)
    }
    
    // If a coach is looking at their student's meals
    const student = await db.user.findFirst({
      where: {
        id: targetDbUserId,
        coachId: currentUser.id,
      },
    })
    
    if (!student) {
      return new NextResponse("Unauthorized: Not the student's coach", { status: 403 })
    }
    
    const meals = await db.meal.findMany({
      where: {
        userId: targetDbUserId,
        ...(date && {
          date: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
        }),
      },
      orderBy: {
        date: "desc",
      },
    })
    
    return NextResponse.json(meals)
  } catch (error) {
    console.error("[USER_MEALS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// Create meal for a user (either by themselves or by their coach)
export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await requireAuth();
    if (session instanceof NextResponse) return session;
    const currentUser = session;

    // Resolve params.userId (Clerk ID) to DB user ID
    const targetDbUserId = await resolveClerkIdToDbUserId(params.userId)
    if (!targetDbUserId) {
      return new NextResponse("User not found", { status: 404 })
    }
    
    // Check if it's the user creating their own meal or if it's their coach
    if (currentUser.id !== targetDbUserId) {
      // Verify the coach-student relationship
      const student = await db.user.findFirst({
        where: {
          id: targetDbUserId,
          coachId: currentUser.id,
        },
      })
      
      if (!student) {
        return new NextResponse("Unauthorized: Not the student's coach", { status: 403 })
      }
    }

    // Get the request body and validate it
    const json = await req.json()
    const body = mealCreateSchema.parse(json)

    // Create the meal
    const meal = await db.meal.create({
      data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        calories: body.calories,
        protein: body.protein,
        carbs: body.carbs,
        fat: body.fat,
        date: body.date,
        userId: targetDbUserId,
      },
    })

    return NextResponse.json(meal)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    console.error("[USER_MEALS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
