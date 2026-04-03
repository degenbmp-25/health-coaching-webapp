import { NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-utils"
import { userNameSchema } from "@/lib/validations/user"

const routeContextSchema = z.object({
  params: z.object({
    userId: z.string(),
  }),
})

export async function GET(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // If user is getting their own details
    // Compare database UUIDs since the frontend sends database UUID
    if (params.userId === user.id) {
      const userDetails = await db.user.findUnique({
        where: {
          id: params.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })

      if (!userDetails) {
        return new NextResponse("User not found", { status: 404 })
      }

      return NextResponse.json(userDetails)
    }
    
    // If an owner/trainer is getting member details within their organization
    // Check OrganizationMember table for role (multi-tenant model)
    const requestingUserMembership = await db.organizationMember.findFirst({
      where: {
        userId: user.id,
        role: { in: ["owner", "trainer"] },
      },
    })

    if (requestingUserMembership) {
      // Check if the requested user is a member of the same organization
      const targetMembership = await db.organizationMember.findFirst({
        where: {
          userId: params.userId,
          organizationId: requestingUserMembership.organizationId,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, organizationRole: true, primaryTrainerId: true },
            include: { programAssignments: true, workoutSessions: true },
          },
        },
      })

      if (targetMembership) {
        return NextResponse.json(targetMembership.user)
      }
    }
    
    // Check if the requesting user is the coach of the target user (via coachId relationship)
    const isCoachOfStudent = await db.user.findFirst({
      where: {
        id: params.userId,
        coachId: user.id,
      },
    })
    
    // Also check if current user has coach role
    const isCoach = user.role === "coach"
    
    if (isCoachOfStudent || isCoach) {
      const studentDetails = await db.user.findUnique({
        where: {
          id: params.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })

      if (studentDetails) {
        return NextResponse.json(studentDetails)
      }
    }
    
    // Default case: fetch limited public info
    const userDetails = await db.user.findUnique({
      where: {
        id: params.userId,
      },
      select: {
        id: true,
        name: true,
        image: true,
      },
    })

    if (!userDetails) {
      return new NextResponse("User not found", { status: 404 })
    }

    return NextResponse.json(userDetails)
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  context: z.infer<typeof routeContextSchema>
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await requireAuth()

    if (user instanceof NextResponse) {
      return user
    }

    // Compare database UUIDs since the frontend sends database UUID
    if (user.id !== params.userId) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = userNameSchema.parse(json)

    const updatedUser = await db.user.update({
      where: {
        id: params.userId,
      },
      data: {
        name: body.name,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    return new NextResponse("Internal Error", { status: 500 })
  }
}
