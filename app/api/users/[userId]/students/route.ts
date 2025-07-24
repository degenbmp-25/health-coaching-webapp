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
    // Compare Clerk IDs since the frontend sends Clerk ID
    if (currentUser.clerkId !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Check if user is a coach
    const coach = await db.user.findUnique({
      where: {
        clerkId: params.userId,
      },
      select: {
        id: true,
        role: true,
      },
    })

    if (!coach || coach.role !== "coach") {
      return new NextResponse("User is not a coach", { status: 400 })
    }

    // Get students where coachId matches the database ID of the coach
    const students = await db.user.findMany({
      where: {
        coachId: coach.id,
      },
      select: {
        id: true,
        clerkId: true,
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