import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// Get activities for a user (accessible by the user or org trainers/owners)
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Authorization: own data or org trainer/owner
    if (user.id !== params.userId) {
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          role: { in: ["owner", "trainer"] },
          organizationId: params.userId,
        },
      })
      if (!membership) {
        return new NextResponse("Forbidden", { status: 403 })
      }
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

// Create a new activity for a user (org trainers/owners can create for org members)
export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Authorization: own data or org trainer/owner
    if (user.id !== params.userId) {
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          role: { in: ["owner", "trainer"] },
          organizationId: params.userId,
        },
      })
      if (!membership) {
        return new NextResponse("Forbidden", { status: 403 })
      }
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
