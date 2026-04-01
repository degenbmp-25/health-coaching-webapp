import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { resolveClerkIdToDbUserId } from "@/lib/api/id-utils"

// Get user's coach
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

    // Only the user themselves can view their coach
    if (user.id !== targetDbUserId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const userWithCoach = await db.user.findUnique({
      where: {
        id: targetDbUserId,
      },
      include: {
        coach: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    if (!userWithCoach) {
      return new NextResponse("User not found", { status: 404 })
    }

    return NextResponse.json(userWithCoach.coach)
  } catch (error) {
    console.error("[USER_COACH_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

// Set user's coach
export async function PATCH(
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

    // Only the user themselves can set their coach
    if (user.id !== targetDbUserId) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { coachId } = await req.json()

    // Allow null to remove the coach
    if (coachId === null) {
      const updatedUser = await db.user.update({
        where: {
          id: targetDbUserId,
        },
        data: {
          coachId: null,
        },
        include: {
          coach: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      })
      return NextResponse.json(updatedUser.coach)
    }

    if (!coachId) {
      return new NextResponse("Coach ID is required", { status: 400 })
    }

    // Verify the coach exists and has the coach role (check OrganizationMember.role)
    // coachId here is the database ID from the coach selector
    const coach = await db.user.findUnique({
      where: {
        id: coachId,
      },
    })

    if (!coach) {
      return new NextResponse("Coach not found", { status: 404 })
    }

    // Check OrganizationMember.role for coach access
    const coachMembership = await db.organizationMember.findFirst({
      where: {
        userId: coachId,
        role: { in: ["owner", "trainer", "coach"] },
      },
    })

    if (!coachMembership) {
      return new NextResponse("User is not a coach", { status: 400 })
    }

    // Update the user's coach
    const updatedUser = await db.user.update({
      where: {
        id: targetDbUserId,
      },
      data: {
        coachId: coachId,
      },
      include: {
        coach: {
          select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(updatedUser.coach)
  } catch (error) {
    console.error("[USER_COACH_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
