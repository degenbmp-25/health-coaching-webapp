import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const createProgramSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  organizationId: z.string().min(1),
  workoutIds: z.array(z.string()).optional(),
})

// POST /api/programs - Create a new program
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = createProgramSchema.parse(json)

    // Check if user is a member of the organization
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: body.organizationId,
          userId: user.id,
        },
      },
    })

    if (!membership || !["owner", "trainer"].includes(membership.role)) {
      return new Response("Forbidden", { status: 403 })
    }

    const program = await db.program.create({
      data: {
        name: body.name,
        description: body.description,
        organizationId: body.organizationId,
        createdById: user.id,
        ...(body.workoutIds && body.workoutIds.length > 0 && {
          workouts: {
            connect: body.workoutIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
        workouts: {
          select: { id: true, name: true },
        },
        _count: { select: { assignments: true } },
      },
    })

    return NextResponse.json(program, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error creating program:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// GET /api/programs - List programs for user's organizations
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response("Unauthorized", { status: 403 })
    }

    // Get user's organization memberships
    const memberships = await db.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    })

    const organizationIds = memberships.map((m) => m.organizationId)

    const programs = await db.program.findMany({
      where: {
        organizationId: { in: organizationIds },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        organization: {
          select: { id: true, name: true },
        },
        _count: {
          select: { workouts: true, assignments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(programs)
  } catch (error) {
    console.error("Error fetching programs:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
