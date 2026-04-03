import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { goalSchema } from "@/lib/validations/goal"
import { resolveClerkIdToDbUserId } from "@/lib/api/id-utils"

export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    
    if (user instanceof NextResponse) {
      return user
    }

    const json = await req.json()
    const parsed = goalSchema.safeParse(json)
    
    if (!parsed.success) {
      return new NextResponse(JSON.stringify(parsed.error.issues), { status: 422 })
    }
    
    const { title, description, targetDate, userId: targetUserId } = parsed.data

    // Determine the target user for this goal
    let goalUserId = user.id // Default: own goals
    
    if (targetUserId && targetUserId !== user.id) {
      // Coach/trainer is creating goal for a student
      // Resolve the target user ID (could be Clerk ID or DB ID)
      const targetDbUserId = await resolveClerkIdToDbUserId(targetUserId)
      if (!targetDbUserId) {
        return new NextResponse("Target user not found", { status: 404 })
      }
      
      // Verify the requesting user has authority over this student
      // Check 1: Is the target user's coachId = current user?
      const targetStudent = await db.user.findFirst({
        where: {
          id: targetDbUserId,
          coachId: user.id,
        },
      })
      
      // Check 2: Is the current user an owner/trainer in the same org as target?
      const requestingMembership = await db.organizationMember.findFirst({
        where: {
          userId: user.id,
          role: { in: ["owner", "trainer"] },
        },
      })
      
      let hasOrgAccess = false
      if (requestingMembership) {
        const targetMembership = await db.organizationMember.findFirst({
          where: {
            userId: targetDbUserId,
            organizationId: requestingMembership.organizationId,
          },
        })
        hasOrgAccess = !!targetMembership
      }
      
      // Check 3: Is current user a coach (User.role)?
      const isCoach = user.role === "coach"
      
      if (!targetStudent && !hasOrgAccess && !isCoach) {
        return new NextResponse("Forbidden - You can only create goals for your own students", { status: 403 })
      }
      
      goalUserId = targetDbUserId
    }

    const goal = await db.goal.create({
      data: {
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
        userId: goalUserId,
        lastEditedByCoach: goalUserId !== user.id, // Mark as coach-created if for student
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