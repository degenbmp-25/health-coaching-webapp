import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"

import { db } from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: { userId: string; workoutId: string } }
) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;

    const currentUser = authRes;
    const userId = params.userId;
    const workoutId = params.workoutId;
    
    // If the user is looking at their own workout
    if (currentUser.id === userId) {
      const workout = await db.workout.findFirst({
        where: {
          id: workoutId,
          userId: userId,
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
      })
      
      if (!workout) {
        return new NextResponse("Workout not found", { status: 404 })
      }
      
      return NextResponse.json(workout)
    }
    
    // If a coach is looking at their student's workout
    const student = await db.user.findFirst({
      where: {
        id: userId,
        coachId: currentUser.id,
      },
    })
    
    if (!student) {
      return new NextResponse("Unauthorized: Not the student's coach", { status: 403 })
    }
    
    const workout = await db.workout.findFirst({
      where: {
        id: workoutId,
        userId: userId,
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
    })
    
    if (!workout) {
      return new NextResponse("Workout not found", { status: 404 })
    }
    
    return NextResponse.json(workout)
  } catch (error) {
    console.error("[USER_WORKOUT_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 