import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"

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
  ),
})

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    console.log(`[USER_WORKOUTS_GET] Request for userId: ${params.userId}`)
    
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    console.log(`[USER_WORKOUTS_GET] Session user: ${currentUser.id}, role: ${currentUser.role}`)
    
    // First, find the target user by Clerk ID
    const targetUser = await db.user.findUnique({
      where: {
        clerkId: params.userId,
      },
      select: {
        id: true,
      },
    })

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 })
    }
    
    // If the user is looking at their own workouts
    if (currentUser.clerkId === params.userId) {
      console.log("[USER_WORKOUTS_GET] User requesting their own workouts")
      
      const workouts = await db.workout.findMany({
        where: {
          userId: targetUser.id,
        },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      })
      
      console.log(`[USER_WORKOUTS_GET] Found ${workouts.length} workouts for user`)
      return NextResponse.json(workouts)
    }
    
    // If a coach is looking at their student's workouts
    console.log("[USER_WORKOUTS_GET] Coach checking student workouts")
    
    const student = await db.user.findFirst({
      where: {
        id: targetUser.id,
        coachId: currentUser.id,
      },
    })
    
    if (!student) {
      console.log("[USER_WORKOUTS_GET] Not authorized as student's coach")
      return new NextResponse("Unauthorized: Not the student's coach", { status: 403 })
    }
    
    console.log("[USER_WORKOUTS_GET] Coach authorized for student")
    
    const workouts = await db.workout.findMany({
      where: {
        userId: targetUser.id,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        updatedAt: "desc",
      },
    })
    
    console.log(`[USER_WORKOUTS_GET] Found ${workouts.length} workouts for student`)
    return NextResponse.json(workouts)
  } catch (error) {
    console.error("[USER_WORKOUTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// Create workout for a user (either by themselves or by their coach)
export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    // First, find the target user by Clerk ID
    const targetUser = await db.user.findUnique({
      where: {
        clerkId: params.userId,
      },
      select: {
        id: true,
      },
    })

    if (!targetUser) {
      return new NextResponse("User not found", { status: 404 })
    }
    
    // Check if it's the user creating their own workout or if it's their coach
    if (currentUser.clerkId !== params.userId) {
      // Verify the coach-student relationship
      const student = await db.user.findFirst({
        where: {
          id: targetUser.id,
          coachId: currentUser.id,
        },
      })
      
      if (!student) {
        return new NextResponse("Unauthorized: Not the student's coach", { status: 403 })
      }
    }

    // Get the request body and validate it
    const json = await req.json()
    const body = workoutCreateSchema.parse(json)

    // Create the workout
    const workout = await db.workout.create({
      data: {
        name: body.name,
        description: body.description,
        userId: targetUser.id,
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
      },
    })

    return NextResponse.json(workout)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    console.error("[USER_WORKOUTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 