import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { dateRangeParams } from "@/lib/utils"
import { getDashboardData } from "@/lib/api/dashboard"

// Get student dashboard data for coaches
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    
    // Default date range (last 30 days)
    const dateRange = dateRangeParams({
      from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
    })

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

    // Check if the requesting user is the coach of this student
    const student = await db.user.findFirst({
      where: {
        id: targetUser.id,
        coachId: user.id,
      },
    })

    // Allow access if it's the user's own data or if they're the coach
    if (!student && user.clerkId !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const dashboardData = await getDashboardData(targetUser.id, dateRange)

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("[STUDENT_DASHBOARD_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 