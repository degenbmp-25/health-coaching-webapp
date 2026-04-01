import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { dateRangeParams } from "@/lib/utils"
import { getDashboardData } from "@/lib/api/dashboard"
import { resolveClerkIdToDbUserId } from "@/lib/api/id-utils"

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

    // Resolve params.userId (Clerk ID) to DB user ID
    const targetDbUserId = await resolveClerkIdToDbUserId(params.userId)
    if (!targetDbUserId) {
      return new NextResponse("User not found", { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    // Default date range (last 30 days)
    const dateRange = dateRangeParams({
      from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: to || new Date().toISOString(),
    })

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

    const dashboardData = await getDashboardData(targetDbUserId, dateRange)

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("[STUDENT_DASHBOARD_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
