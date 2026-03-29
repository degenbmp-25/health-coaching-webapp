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

    const dashboardData = await getDashboardData(params.userId, dateRange)

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error("[STUDENT_DASHBOARD_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
