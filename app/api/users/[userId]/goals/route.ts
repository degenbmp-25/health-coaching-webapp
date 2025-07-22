import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/db"

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
    
    // Check if the requesting user is the student's coach
    const student = await db.user.findFirst({
      where: {
        id: params.userId,
        coachId: currentUser.id,
      },
    })

    // Allow if user is viewing their own goals or is the coach
    if (params.userId !== currentUser.id && !student) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const goals = await db.goal.findMany({
      where: { userId: params.userId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(goals)
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 