import { db } from "@/lib/db"

export async function getUserWorkouts(userId: string) {
  return await db.workout.findMany({
    where: {
      userId: userId,
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
    orderBy: {
      updatedAt: "desc",
    },
  })
}

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

export async function getWorkout(workoutId: string, userId: string) {
  return await db.workout.findFirst({
    where: {
      id: workoutId,
      userId: userId,
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
  })
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