import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { updateGoalSchema } from "@/lib/validations/goal"

interface GoalParams {
  params: {
    goalId: string
  }
}

export async function GET(req: Request, { params }: GoalParams) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;
    
    if (!currentUser?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const goal = await db.goal.findFirst({
      where: {
        id: params.goalId,
        userId: currentUser.id,
      },
    })

    if (!goal) {
      return new NextResponse("Goal not found", { status: 404 })
    }

    return NextResponse.json(goal)
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: GoalParams) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;
    
    if (!currentUser?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const json = await req.json()
    const body = updateGoalSchema.parse(json)

    // Check if user owns the goal or is the coach of the goal owner
    const goal = await db.goal.findFirst({
      where: { id: params.goalId },
      include: { user: true },
    })

    if (!goal) {
      return new NextResponse("Goal not found", { status: 404 })
    }

    const isOwner = goal.userId === currentUser.id;
    const isCoach = goal.user.coachId === currentUser.id;

    if (!isOwner && !isCoach) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const updatedGoal = await db.goal.update({
      where: { id: params.goalId },
      data: {
        title: body.title,
        description: body.description,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        isCompleted: body.isCompleted,
        lastEditedByCoach: isCoach,
      },
    })

    return NextResponse.json(updatedGoal)
  } catch (error) {
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: GoalParams) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;
    
    if (!currentUser?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const goal = await db.goal.findFirst({
      where: {
        id: params.goalId,
        userId: currentUser.id,
      },
    })

    if (!goal) {
      return new NextResponse("Goal not found", { status: 404 })
    }

    await db.goal.delete({
      where: { id: params.goalId },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 