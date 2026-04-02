import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-utils"

import { db } from "@/lib/db"
import { resolveClerkIdToDbUserId } from "@/lib/api/id-utils"

// Role constants to avoid magic strings
const ROLE = {
  OWNER: "owner",
  TRAINER: "trainer",
  COACH: "coach",
  CLIENT: "client",
} as const

const workoutCreateSchema = z.object({
  name: z.string().min(3, {
    message: "Workout name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      sets: z.number().min(1),
      reps: z.number().min(1),
      weight: z.number().optional(),
      notes: z.string().optional(),
      order: z.number(),
    })
  ),
})

// Shared authorization helper for GET and POST handlers
async function authorizeWorkoutAccess(
  currentUserId: string,
  targetDbUserId: string // Now takes DB user ID (CUID)
): Promise<{ authorized: boolean; targetMembership: { organizationId: string } | null }> {
  // If accessing own data
  if (currentUserId === targetDbUserId) {
    const targetMembership = await db.organizationMember.findFirst({
      where: { userId: targetDbUserId },
      select: { organizationId: true },
    });
    return { authorized: true, targetMembership };
  }

  // Check coach-student relationship
  const student = await db.user.findFirst({
    where: {
      id: targetDbUserId,
      coachId: currentUserId,
    },
  });

  if (student) {
    // Coach accessing student - return org membership if exists
    const targetMembership = await db.organizationMember.findFirst({
      where: { userId: targetDbUserId },
      select: { organizationId: true },
    });
    return { authorized: true, targetMembership };
  }

  // Fall back to organization membership check
  const targetMembership = await db.organizationMember.findFirst({
    where: { userId: targetDbUserId },
    select: { organizationId: true },
  });

  if (!targetMembership) {
    return { authorized: false, targetMembership: null };
  }

  // Check if current user is trainer/owner/coach in the SAME org as target user
  const membership = await db.organizationMember.findFirst({
    where: {
      userId: currentUserId,
      role: { in: [ROLE.OWNER, ROLE.TRAINER, ROLE.COACH] },
      organizationId: targetMembership.organizationId,
    },
  });

  if (!membership) {
    return { authorized: false, targetMembership };
  }

  return { authorized: true, targetMembership };
}

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    console.log(`[USER_WORKOUTS_GET] Request for userId: ${params.userId}`)

    const authRes = await requireAuth()
    if (authRes instanceof NextResponse) return authRes
    const currentUser = authRes

    console.log(`[USER_WORKOUTS_GET] Session user: ${currentUser.id}, role: ${currentUser.role}`)

    // Resolve params.userId (Clerk ID) to DB user ID
    const targetDbUserId = await resolveClerkIdToDbUserId(params.userId)
    if (!targetDbUserId) {
      console.log("[USER_WORKOUTS_GET] Target user not found")
      return new NextResponse("User not found", { status: 404 })
    }

    // HIGH #1 FIX: Reuse authorization result instead of fetching targetMembership twice
    const { authorized, targetMembership } = await authorizeWorkoutAccess(
      currentUser.id,
      targetDbUserId
    );

    if (!authorized) {
      console.log("[USER_WORKOUTS_GET] Not authorized to access this user's workouts")
      return new NextResponse("Unauthorized", { status: 403 })
    }

    console.log("[USER_WORKOUTS_GET] Authorized, fetching workouts")

    // HIGH #3 FIX: Include user relation in workout results
    let workouts;
    if (targetMembership) {
      // User is in an org — query via program assignments
      const programAssignments = await db.programAssignment.findMany({
        where: { clientId: targetDbUserId },
        select: { programId: true },
      });

      const programIds = programAssignments.map((pa) => pa.programId);

      // HIGH #4 FIX: If no program assignments, fall back to legacy userId query
      if (programIds.length === 0) {
        workouts = await db.workout.findMany({
          where: { userId: targetDbUserId },
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: {
                order: "asc",
              },
            },
            user: { select: { id: true, name: true } },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });
      } else {
        workouts = await db.workout.findMany({
          where: {
            programId: { in: programIds },
          },
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: {
                order: "asc",
              },
            },
            user: { select: { id: true, name: true } },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });
      }
    } else {
      // Fallback to legacy userId query
      workouts = await db.workout.findMany({
        where: { userId: targetDbUserId },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          user: { select: { id: true, name: true } },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    console.log(`[USER_WORKOUTS_GET] Found ${workouts.length} workouts for user`)
    return NextResponse.json(workouts)
  } catch (error) {
    console.error("[USER_WORKOUTS_GET]", error)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}

// Create workout for a user (either by themselves or by org trainer/owner)
export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const authRes = await requireAuth()
    if (authRes instanceof NextResponse) return authRes
    const currentUser = authRes

    // Resolve params.userId (Clerk ID) to DB user ID
    const targetDbUserId = await resolveClerkIdToDbUserId(params.userId)
    if (!targetDbUserId) {
      return new NextResponse("User not found", { status: 404 })
    }

    // HIGH #1 FIX: Reuse authorization helper instead of duplicating logic
    const { authorized, targetMembership } = await authorizeWorkoutAccess(
      currentUser.id,
      targetDbUserId
    );

    if (!authorized) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    // Get the request body and validate it
    const json = await req.json()
    const body = workoutCreateSchema.parse(json)

    // Create the workout
    const workout = await db.workout.create({
      data: {
        name: body.name,
        description: body.description,
        userId: targetDbUserId,
        exercises: {
          create: body.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            notes: exercise.notes,
            order: exercise.order,
          })),
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        user: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(workout)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 })
    }

    console.error("[USER_WORKOUTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
