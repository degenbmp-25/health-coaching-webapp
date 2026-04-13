import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "trainer", "client"]),
  primaryTrainerId: z.string().min(1).optional().nullable(),
})

const updateMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "trainer", "client"]),
})

const removeMemberSchema = z.object({
  userId: z.string().min(1),
})

type RouteContext = z.infer<typeof routeContextSchema>

// GET /api/organizations/:id/members - List organization members
export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return new Response("Forbidden", { status: 403 })
    }

    const members = await db.organizationMember.findMany({
      where: { organizationId: params.id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error("Error fetching members:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// POST /api/organizations/:id/members - Invite a member
export async function POST(
  req: Request,
  context: RouteContext
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: user.id,
        },
      },
    })

    if (!membership || !["owner", "trainer"].includes(membership.role)) {
      return new Response("Forbidden", { status: 403 })
    }

    const json = await req.json()
    const body = inviteMemberSchema.parse(json)

    const invitedUser = await db.user.findUnique({
      where: { email: body.email },
    })

    if (!invitedUser) {
      return NextResponse.json(
        { error: "User not found with this email" },
        { status: 404 }
      )
    }

    const existingMembership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: invitedUser.id,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member" },
        { status: 409 }
      )
    }

    let primaryTrainerId: string | null = null
    if (body.role === "client") {
      primaryTrainerId = body.primaryTrainerId ?? user.id

      const trainerMembership = await db.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: params.id,
            userId: primaryTrainerId,
          },
        },
      })

      if (!trainerMembership || !["owner", "trainer"].includes(trainerMembership.role)) {
        return NextResponse.json(
          { error: "Primary trainer must be an owner or trainer in this organization" },
          { status: 400 }
        )
      }
    }

    const newMembership = await db.organizationMember.create({
      data: {
        organizationId: params.id,
        userId: invitedUser.id,
        role: body.role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    await db.user.update({
      where: { id: invitedUser.id },
      data: {
        organizationRole: body.role,
        ...(body.role === "client" ? { primaryTrainerId } : {}),
      },
    })

    return NextResponse.json(newMembership, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error inviting member:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// PATCH /api/organizations/:id/members - Update member role (userId in body)
export async function PATCH(
  req: Request,
  context: RouteContext
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: user.id,
        },
      },
    })

    if (!membership || membership.role !== "owner") {
      return new Response("Forbidden", { status: 403 })
    }

    const json = await req.json()
    const body = updateMemberSchema.parse(json)

    const targetMembership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: body.userId,
        },
      },
    })

    if (!targetMembership) {
      return new Response("Not Found", { status: 404 })
    }

    if (targetMembership.role === "owner") {
      return NextResponse.json(
        { error: "Cannot change owner's role" },
        { status: 400 }
      )
    }

    const updated = await db.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: body.userId,
        },
      },
      data: { role: body.role },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    await db.user.update({
      where: { id: body.userId },
      data: { organizationRole: body.role },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error updating member:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// DELETE /api/organizations/:id/members - Remove member (userId in body)
export async function DELETE(
  req: Request,
  context: RouteContext
) {
  try {
    const { params } = routeContextSchema.parse(context)
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = removeMemberSchema.parse(json)

    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: user.id,
        },
      },
    })

    const isRemovingSelf = user.id === body.userId
    const canRemove = membership?.role === "owner" || isRemovingSelf

    if (!canRemove) {
      return new Response("Forbidden", { status: 403 })
    }

    const targetMembership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: body.userId,
        },
      },
    })

    if (!targetMembership) {
      return new Response("Not Found", { status: 404 })
    }

    if (targetMembership.role === "owner") {
      return NextResponse.json(
        { error: "Cannot remove owner" },
        { status: 400 }
      )
    }

    await db.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: params.id,
          userId: body.userId,
        },
      },
    })

    const otherMemberships = await db.organizationMember.count({
      where: { userId: body.userId },
    })

    if (otherMemberships === 0) {
      await db.user.update({
        where: { id: body.userId },
        data: {
          organizationRole: null,
          primaryTrainerId: null,
        },
      })
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Error removing member:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
