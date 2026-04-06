import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    clientId: z.string(),
  }),
})

type RouteContext = z.infer<typeof routeContextSchema>

// GET /api/program-assignments/client/:clientId - Get client's assigned programs
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

    const isSelf = user.id === params.clientId

    if (!isSelf) {
      // Check if user is trainer/owner in any org the client belongs to
      const clientMemberships = await db.organizationMember.findMany({
        where: { userId: params.clientId },
        select: { organizationId: true },
      })

      const clientOrgIds = clientMemberships.map((m) => m.organizationId)

      if (clientOrgIds.length > 0) {
        const userMembership = await db.organizationMember.findFirst({
          where: {
            userId: user.id,
            organizationId: { in: clientOrgIds },
            role: { in: ["owner", "trainer"] },
          },
        })

        if (!userMembership) {
          return new Response("Forbidden", { status: 403 })
        }
      } else {
        // Also allow if user is the client's primary trainer
        const client = await db.user.findUnique({
          where: { id: params.clientId },
          select: { primaryTrainerId: true },
        })

        if (!client || client.primaryTrainerId !== user.id) {
          return new Response("Forbidden", { status: 403 })
        }
      }
    }

    const assignments = await db.programAssignment.findMany({
      where: { clientId: params.clientId },
      include: {
        program: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
            workouts: {
              select: { id: true, name: true },
            },
            createdBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    })

    // Get workout completion stats for this client
    const sessions = await db.workoutSession.findMany({
      where: {
        userId: params.clientId,
        status: "completed",
      },
      select: {
        workoutId: true,
        completedAt: true,
      },
    })

    const completedWorkoutIds = new Set(sessions.map((s) => s.workoutId))

    const assignmentsWithStats = assignments.map((a) => ({
      ...a,
      program: {
        ...a.program,
        workoutCount: a.program.workouts.length,
        completedWorkoutCount: a.program.workouts.filter(
          (w) => completedWorkoutIds.has(w.id)
        ).length,
        workouts: undefined,
      },
    }))

    return NextResponse.json(assignmentsWithStats)
  } catch (error) {
    console.error("Error fetching client programs:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
