import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// Get user's coach
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Only the user themselves can view their coach
    if (user.id !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const userWithCoach = await db.user.findUnique({
      where: {
        id: params.userId,
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (!userWithCoach) {
      return new NextResponse("User not found", { status: 404 })
    }

    return NextResponse.json(userWithCoach.coach)
  } catch (error) {
    console.error("[USER_COACH_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// Set user's coach
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Only the user themselves can set their coach
    if (user.id !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { coachId } = await req.json()

    if (!coachId) {
      return new NextResponse("Coach ID is required", { status: 400 })
    }

    // Verify the coach exists and has the coach role
    const coach = await db.user.findUnique({
      where: {
        id: coachId,
      },
    })

    if (!coach) {
      return new NextResponse("Coach not found", { status: 404 })
    }

    if (coach.role !== "coach") {
      return new NextResponse("User is not a coach", { status: 400 })
    }

    // Update the user's coach
    const updatedUser = await db.user.update({
      where: {
        id: params.userId,
      },
      data: {
        coachId: coachId,
      },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(updatedUser.coach)
  } catch (error) {
    console.error("[USER_COACH_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 