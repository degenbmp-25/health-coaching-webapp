import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    
    if (user instanceof NextResponse) {
      return user
    }

    const json = await req.json()
    const { title, description, targetDate } = json

    const goal = await db.goal.create({
      data: {
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
        userId: user.id,
      },
    })

    return NextResponse.json(goal)
  } catch (error) {
    console.error("[GOALS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await requireAuth()
    
    if (user instanceof NextResponse) {
      return user
    }

    const goals = await db.goal.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error("[GOALS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 