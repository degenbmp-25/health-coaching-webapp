import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["gym", "personal"]).optional(),
})

type RouteContext = z.infer<typeof routeContextSchema>

// GET /api/organizations/:id - Get organization details
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

    // Check if user is a member of this organization
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

    const organization = await db.organization.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
        programs: {
          include: {
            createdBy: {
              select: { id: true, name: true },
            },
            _count: { select: { workouts: true, assignments: true } },
          },
        },
        sheetConnections: {
          include: {
            trainer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!organization) {
      return new Response("Not Found", { status: 404 })
    }

    return NextResponse.json({
      ...organization,
      userRole: membership.role,
    })
  } catch (error) {
    console.error("Error fetching organization:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// PATCH /api/organizations/:id - Update organization
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

    // Check if user is an owner
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
    const body = updateOrganizationSchema.parse(json)

    const organization = await db.organization.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.type && { type: body.type }),
      },
    })

    return NextResponse.json(organization)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error updating organization:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// DELETE /api/organizations/:id - Delete organization (owner only)
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

    // Check if user is an owner
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

    await db.organization.delete({
      where: { id: params.id },
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Error deleting organization:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
