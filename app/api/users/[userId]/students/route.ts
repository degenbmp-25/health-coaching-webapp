import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"

// GET /api/users/[userId]/students - Get coach's students
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Only the user themselves can view their students
    if (user.id !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    // Get users where this user is the coach
    const students = await db.user.findMany({
      where: {
        coachId: user.id,
      },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error("[USERS_STUDENTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// POST /api/users/[userId]/students - Coach adds a client
export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Only coaches can add students
    if (user.role !== "coach") {
      return new NextResponse("Forbidden - Coach access required", { status: 403 })
    }

    // Only the user themselves can add students to themselves
    if (user.id !== params.userId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { clientId } = await req.json()

    if (!clientId) {
      return new NextResponse("Client ID is required", { status: 400 })
    }

    // Verify the client exists
    const client = await db.user.findUnique({
      where: {
        id: clientId,
      },
    })

    if (!client) {
      return new NextResponse("Client not found", { status: 404 })
    }

    // Set the client's coachId to this coach
    const updatedClient = await db.user.update({
      where: {
        id: clientId,
      },
      data: {
        coachId: user.id,
      },
      select: {
        id: true,
        clerkId: true,
        name: true,
        email: true,
        image: true,
      },
    })

    return NextResponse.json(updatedClient)
  } catch (error) {
    console.error("[USERS_STUDENTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}