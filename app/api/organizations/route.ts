import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const createOrganizationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["gym", "personal"]),
})

// POST /api/organizations - Create a new organization
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = createOrganizationSchema.parse(json)

    // Create the organization
    const organization = await db.organization.create({
      data: {
        name: body.name,
        type: body.type,
      },
    })

    // Add the creator as an owner member
    await db.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: "owner",
      },
    })

    // Update user's organization role
    await db.user.update({
      where: { id: user.id },
      data: { organizationRole: "owner" },
    })

    return NextResponse.json(organization, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error creating organization:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// GET /api/organizations - List organizations for current user
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const memberships = await db.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          include: {
            members: { select: { id: true, role: true } },
            programs: { select: { id: true } },
          },
        },
      },
    })

    const organizations = memberships.map((m) => ({
      ...m.organization,
      userRole: m.role,
      memberCount: m.organization.members.length,
      trainerCount: m.organization.members.filter((m) => m.role === "trainer").length,
      programCount: m.organization.programs.length,
    }))

    return NextResponse.json(organizations)
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
