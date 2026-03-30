import { z } from "zod"
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    programId: z.string(),
  }),
})

type RouteContext = z.infer<typeof routeContextSchema>

// GET /api/workouts/program/:programId - Get workouts in a program
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

    // Get the program and verify access
    const program = await db.program.findUnique({
      where: { id: params.programId },
      include: { organization: true },
    })

    if (!program) {
      return new Response("Not Found", { status: 404 })
    }

    // Check if user is a member of the organization
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

    // Check for week filter in query params
    const { searchParams } = new URL(req.url)
    const weekFilter = searchParams.get("week")

    const whereClause: any = { programId: params.programId }
    if (weekFilter !== null) {
      const weekNum = parseInt(weekFilter, 10)
      if (!isNaN(weekNum)) {
        whereClause.weekNumber = weekNum
      }
    }

    const workouts = await db.workout.findMany({
      where: whereClause,
      include: {
        exercises: {
          include: {
            exercise: {
              select: { id: true, name: true, category: true, muscleGroup: true },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: [
        { weekNumber: "asc" },
        { dayOfWeek: "asc" },
        { createdAt: "asc" },
      ],
    })

    // Get user's completion status for these workouts
    const sessions = await db.workoutSession.findMany({
      where: {
        userId: user.id,
        workoutId: { in: workouts.map((w) => w.id) },
        status: "completed",
      },
      select: {
        workoutId: true,
        completedAt: true,
      },
    })

    const completedWorkoutIds = new Set(sessions.map((s) => s.workoutId))

    const workoutsWithStatus = workouts.map((w) => ({
      ...w,
      isCompleted: completedWorkoutIds.has(w.id),
      sessionCount: w._count.sessions,
      _count: undefined,
    }))

    // Group workouts by week if no week filter applied
    let groupedWorkouts: Record<number, typeof workoutsWithStatus> | null = null
    if (weekFilter === null) {
      groupedWorkouts = {}
      for (const workout of workoutsWithStatus) {
        const week = workout.weekNumber ?? 0
        if (!groupedWorkouts[week]) {
          groupedWorkouts[week] = []
        }
        groupedWorkouts[week].push(workout)
      }
    }

    return NextResponse.json({
      program: {
        id: program.id,
        name: program.name,
        description: program.description,
      },
      workouts: workoutsWithStatus,
      groupedByWeek: groupedWorkouts,
    })
  } catch (error) {
    console.error("Error fetching program workouts:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
