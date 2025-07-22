import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"

import { db } from "@/lib/db"

// Get all students for a coach
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const authRes = await requireAuth();
    if (authRes instanceof NextResponse) return authRes;
    const currentUser = authRes;

    // Only the coach themselves can view their students
    if (currentUser.id !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if user is a coach
    const coach = await db.user.findUnique({
      where: {
        id: params.userId,
      },
      select: {
        role: true as any,
      },
    })

    if (!coach || coach.role !== "coach") {
      return new NextResponse("User is not a coach", { status: 400 })
    }

    const students = await db.user.findMany({
      where: {
        coachId: params.userId as any,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error("[COACH_STUDENTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 