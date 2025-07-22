import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// Get activities for a user (accessible by the user or their coach)
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Check if user is accessing their own activities or if they're a coach accessing student's activities
    let hasAccess = false

    if (user.id === params.userId) {
      hasAccess = true
    } else if (user.role === "coach") {
      // Check if the requested user is one of their students
      const student = await db.user.findFirst({
        where: {
          id: params.userId,
          coachId: user.id,
        },
      })
      hasAccess = !!student
    }

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const activities = await db.activity.findMany({
      where: {
        userId: params.userId,
      },
      include: {
        activityLogs: {
          orderBy: {
            date: "desc",
          },
          take: 5,
        },
      },
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error("[USER_ACTIVITIES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// Create a new activity for a user (coaches can create for their students)
export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Check if user is creating for themselves or if they're a coach creating for their student
    let hasAccess = false

    if (user.id === params.userId) {
      hasAccess = true
    } else if (user.role === "coach") {
      // Check if the requested user is one of their students
      const student = await db.user.findFirst({
        where: {
          id: params.userId,
          coachId: user.id,
        },
      })
      hasAccess = !!student
    }

    if (!hasAccess) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const json = await req.json()
    const { name, description, colorCode } = json

    const activity = await db.activity.create({
      data: {
        name,
        description,
        colorCode,
        userId: params.userId,
      },
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error("[USER_ACTIVITIES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 