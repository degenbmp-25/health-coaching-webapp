import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { resolveClerkIdToDbUserId, getClerkUserId } from "@/lib/api/id-utils"

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

    // Resolve params.userId (Clerk ID) to DB user ID
    const targetDbUserId = await resolveClerkIdToDbUserId(params.userId)
    if (!targetDbUserId) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Authorization: own data or org trainer/owner
    if (user.id !== targetDbUserId) {
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          role: { in: ["owner", "trainer", "coach"] },
        },
      })
      if (!membership) {
        return new NextResponse("Forbidden", { status: 403 })
      }
    }

    const activities = await db.activity.findMany({
      where: {
        userId: targetDbUserId,
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

    // Resolve params.userId (Clerk ID) to DB user ID
    const targetDbUserId = await resolveClerkIdToDbUserId(params.userId)
    if (!targetDbUserId) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Authorization: own data or org trainer/owner
    if (user.id !== targetDbUserId) {
      const membership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          role: { in: ["owner", "trainer", "coach"] },
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
        userId: targetDbUserId,
      },
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error("[USER_ACTIVITIES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
