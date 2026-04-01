import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { resolveClerkIdToDbUserId } from "@/lib/api/id-utils"

interface UserGoalsParams {
  params: {
    userId: string
  }
}

export async function GET(req: Request, { params }: UserGoalsParams) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;
    
    // Resolve params.userId (Clerk ID) to DB user ID
    const targetDbUserId = await resolveClerkIdToDbUserId(params.userId)
    if (!targetDbUserId) {
      return new NextResponse("User not found", { status: 404 })
    }

    // Check if the requesting user is the student's coach
    const student = await db.user.findFirst({
      where: {
        id: targetDbUserId,
        coachId: currentUser.id,
      },
    })

    // Also check org membership as fallback (allows trainers/owners to view any trainee goals)
    const membership = await db.organizationMember.findFirst({
      where: {
        userId: currentUser.id,
        role: { in: ["owner", "trainer", "coach"] },
      },
    })

    // Allow if user is viewing their own goals, is the coach, or has org-level trainer access
    if (currentUser.id !== targetDbUserId && !student && !membership) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const goals = await db.goal.findMany({
      where: { userId: targetDbUserId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(goals)
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
