import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { activityPatchSchema } from "@/lib/validations/activity"

export async function GET() {
  try {
    const user = await requireAuth()
    
    if (user instanceof NextResponse) {
      return user
    }

    const activities = await db.activity.findMany({
      where: {
        userId: user.id,
      },
      include: {
        activityLogs: {
          orderBy: {
            date: "desc",
          },
          take: 1,
        },
      },
    })

    return NextResponse.json(activities)
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    
    if (user instanceof NextResponse) {
      return user
    }

    const json = await req.json()
    const body = activityPatchSchema.parse(json)

    const activity = await db.activity.create({
      data: {
        name: body.name,
        description: body.description,
        colorCode: body.colorCode,
        scheduledDays: body.scheduledDays || [],
        targetCount: body.targetCount,
        userId: user.id,
      },
    })

    return NextResponse.json(activity)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse("Internal Error", { status: 500 })
  }
}
