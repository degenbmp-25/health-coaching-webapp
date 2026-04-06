import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const createAssignmentSchema = z.object({
  programId: z.string().min(1),
  clientId: z.string().min(1),
})

// POST /api/program-assignments - Assign program to client
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = createAssignmentSchema.parse(json)

    // Get the program and check organization
    const program = await db.program.findUnique({
      where: { id: body.programId },
    })

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      )
    }

    // Check if user has permission (owner/trainer in same org)
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: program.organizationId,
          userId: user.id,
        },
      },
    })

    if (!membership || !["owner", "trainer"].includes(membership.role)) {
      return new Response("Forbidden", { status: 403 })
    }

    // Check if client is in the same organization
    const clientMembership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: program.organizationId,
          userId: body.clientId,
        },
      },
    })

    if (!clientMembership) {
      return NextResponse.json(
        { error: "Client is not a member of this organization" },
        { status: 400 }
      )
    }

    // Check if already assigned
    const existing = await db.programAssignment.findUnique({
      where: {
        programId_clientId: {
          programId: body.programId,
          clientId: body.clientId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Program already assigned to this client" },
        { status: 409 }
      )
    }

    const assignment = await db.programAssignment.create({
      data: {
        programId: body.programId,
        clientId: body.clientId,
      },
      include: {
        program: {
          select: { id: true, name: true },
        },
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error creating assignment:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// GET /api/program-assignments - List all assignments (for trainers/owners)
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Get user's organizations
    const memberships = await db.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    })

    const organizationIds = memberships.map((m) => m.organizationId)

    // Get programs created by user or in their organizations
    const assignments = await db.programAssignment.findMany({
      where: {
        OR: [
          { clientId: user.id },
          {
            program: {
              organizationId: { in: organizationIds },
            },
          },
        ],
      },
      include: {
        program: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
            _count: { select: { workouts: true } },
          },
        },
        client: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
