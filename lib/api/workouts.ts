import { db } from "@/lib/db"

// Role constants to avoid magic strings
const ROLE = {
  OWNER: "owner",
  TRAINER: "trainer",
  CLIENT: "client",
} as const

/**
 * Get workouts for a user with multi-tenant awareness.
 * - Clients: workouts from assigned programs via ProgramAssignment
 * - Trainers/Owners: workouts from all programs in their organization(s)
 * - Users without org membership: legacy fallback via userId
 */
export async function getUserWorkouts(userId: string) {
  // Step 1: Find the user's organization membership(s)
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });

  // Step 2: If no org membership, fall back to legacy userId query (backward compat)
  if (memberships.length === 0) {
    return await db.workout.findMany({
      where: { userId },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // Step 3: Check if user is a client (client role in any org)
  const isClient = memberships.some((m) => m.role === ROLE.CLIENT);
  const isTrainerOrOwner = memberships.some((m) =>
    (m.role === ROLE.OWNER || m.role === ROLE.TRAINER)
  );

  // STEP 4A: CLIENT — get workouts from assigned programs
  if (isClient && !isTrainerOrOwner) {
    const programAssignments = await db.programAssignment.findMany({
      where: { clientId: userId },
      select: { programId: true },
    });

    const programIds = programAssignments.map((p) => p.programId);

    // HIGH #4 FIX: If no program assignments, fall back to legacy userId query
    if (programIds.length === 0) {
      return await db.workout.findMany({
        where: { userId },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: "asc" },
          },
          user: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    return await db.workout.findMany({
      where: {
        programId: { in: programIds },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  // STEP 4B: TRAINER/OWNER — get workouts from all programs in their org(s)
  const orgIds = memberships.map((m) => m.organizationId);

  const programs = await db.program.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });

  const programIds = programs.map((p) => p.id);

  return await db.workout.findMany({
    where: {
      programId: { in: programIds },
    },
    include: {
      exercises: {
        include: { exercise: true },
        orderBy: { order: "asc" },
      },
      user: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// MEDIUM #3 FIX: Removed dead code getClientWorkouts and getTrainerWorkouts
// They duplicated logic in getUserWorkouts and were never used

/**
 * Get workouts for a specific student (coach access).
 * @deprecated Use getUserWorkouts with proper authorization instead.
 */
export async function getStudentWorkouts(studentId: string, coachId: string) {
  // First check if the coach is actually the student's coach
  const student = await db.user.findFirst({
    where: {
      id: studentId,
      coachId: coachId,
    },
  });

  if (!student) {
    throw new Error("Unauthorized: Not the student's coach");
  }

  return await db.workout.findMany({
    where: {
      userId: studentId,
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
      user: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: {
      updatedAt: "desc",
    },
  })
}

/**
 * Get a single workout by ID with proper authorization.
 * - Users can access their own workouts
 * - Coaches can access their students' workouts
 * - Trainers/owners can access workouts in their organization
 */
export async function getWorkout(workoutId: string, authorizedUserId: string) {
  // First try: direct ownership
  const workout = await db.workout.findFirst({
    where: {
      id: workoutId,
      userId: authorizedUserId,
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
    },
  });

  if (workout) return workout;

  // Second try: check if authorized user is the coach of the workout owner
  const workoutOwner = await db.workout.findUnique({
    where: { id: workoutId },
    select: { userId: true },
  });

  if (workoutOwner) {
    // Check if the authorized user is the coach of the workout owner
    const isCoachOfOwner = await db.user.findFirst({
      where: {
        id: workoutOwner.userId,
        coachId: authorizedUserId,
      },
    });

    if (isCoachOfOwner) {
      return await db.workout.findUnique({
        where: { id: workoutId },
        include: {
          exercises: {
            include: {
              exercise: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });
    }

    // Third try: check if authorized user is a trainer/owner in the org
    const membership = await db.organizationMember.findFirst({
      where: {
        userId: authorizedUserId,
        role: { in: ["owner", "trainer"] },
      },
    });

    if (membership) {
      // Check if workout is in a program within the trainer's organization
      const workoutWithProgram = await db.workout.findUnique({
        where: { id: workoutId },
        include: {
          program: {
            select: { organizationId: true },
          },
        },
      });

      if (workoutWithProgram?.program?.organizationId === membership.organizationId) {
        return await db.workout.findUnique({
          where: { id: workoutId },
          include: {
            exercises: {
              include: {
                exercise: true,
              },
              orderBy: {
                order: "asc",
              },
            },
          },
        });
      }
    }
  }

  return null;
}

export async function getStudentWorkout(workoutId: string, studentId: string, coachId: string) {
  // First check if the coach is actually the student's coach
  const student = await db.user.findFirst({
    where: {
      id: studentId,
      coachId: coachId,
    },
  });

  if (!student) {
    throw new Error("Unauthorized: Not the student's coach");
  }

  return await db.workout.findFirst({
    where: {
      id: workoutId,
      userId: studentId,
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
      user: {
        select: {
          id: true,
          name: true,
        }
      }
    },
  })
}

export async function getExercises() {
  return await db.exercise.findMany({
    orderBy: {
      name: "asc",
    },
  })
}