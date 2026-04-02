import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
})

const updateProgramSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  // Program date/duration tracking
  startDate: z.string().datetime().optional().nullable(),
  totalWeeks: z.number().int().min(1).max(52).optional().nullable(),
  // Atomic workout operations - add specific workouts (eliminates race condition)
  addWorkoutIds: z.array(z.string()).optional(),
  removeWorkoutIds: z.array(z.string()).optional(),
})

type RouteContext = z.infer<typeof routeContextSchema>

// GET /api/programs/:id - Get program details
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

    const program = await db.program.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        organization: {
          select: { id: true, name: true, type: true },
        },
        workouts: {
          include: {
            exercises: {
              include: {
                exercise: {
                  select: { id: true, name: true, category: true },
                },
              },
              orderBy: { order: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        assignments: {
          include: {
            client: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    })

    if (!program) {
      return new Response("Not Found", { status: 404 })
    }

    // Check if user has access (is in the same organization)
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: program.organizationId,
          userId: user.id,
        },
      },
    })

    if (!membership) {
      return new Response("Forbidden", { status: 403 })
    }

    return NextResponse.json(program)
  } catch (error) {
    console.error("Error fetching program:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// PATCH /api/programs/:id - Update program
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

    const program = await db.program.findUnique({
      where: { id: params.id },
      include: { organization: true },
    })

    if (!program) {
      return new Response("Not Found", { status: 404 })
    }

    // Check if user is an owner or trainer (trainers can modify workouts)
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: program.organizationId,
          userId: user.id,
        },
      },
    })

    if (!membership || (membership.role !== "owner" && membership.role !== "trainer")) {
      return new Response("Forbidden", { status: 403 })
    }

    const json = await req.json()
    const body = updateProgramSchema.parse(json)

    // Atomically add/remove workouts (no read-then-write race condition)
    if (body.addWorkoutIds && body.addWorkoutIds.length > 0) {
      await db.workout.updateMany({
        where: { id: { in: body.addWorkoutIds } },
        data: { programId: params.id },
      })
    }

    if (body.removeWorkoutIds && body.removeWorkoutIds.length > 0) {
      await db.workout.updateMany({
        where: { id: { in: body.removeWorkoutIds }, programId: params.id },
        data: { programId: null },
      })
    }

    const updated = await db.program.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.totalWeeks !== undefined && { totalWeeks: body.totalWeeks }),
      },
      include: {
        workouts: {
          select: { id: true, name: true },
        },
        _count: { select: { assignments: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 })
    }
    console.error("Error updating program:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

// DELETE /api/programs/:id - Delete program
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

    const program = await db.program.findUnique({
      where: { id: params.id },
    })

    if (!program) {
      return new Response("Not Found", { status: 404 })
    }

    // Check if user is an owner
    const membership = await db.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: program.organizationId,
          userId: user.id,
        },
      },
    })

    if (!membership || membership.role !== "owner") {
      return new Response("Forbidden", { status: 403 })
    }

    // Delete program (cascades to assignments)
    await db.program.delete({
      where: { id: params.id },
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Error deleting program:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
