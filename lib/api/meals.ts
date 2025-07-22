import { db } from "@/lib/db"

export async function getUserMeals(userId: string, date?: Date) {
  const where = {
    userId,
    ...(date && {
      date: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    }),
  }

  return await db.meal.findMany({
    where,
    orderBy: {
      date: "desc",
    },
  })
}

export async function getStudentMeals(studentId: string, coachId: string, date?: Date) {
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

  const where = {
    userId: studentId,
    ...(date && {
      date: {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      },
    }),
  }

  return await db.meal.findMany({
    where,
    orderBy: {
      date: "desc",
    },
  })
}

export async function getMeal(mealId: string, userId: string) {
  return await db.meal.findFirst({
    where: {
      id: mealId,
      userId: userId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      date: true,
    },
  })
}

// Allow a coach to view a student's meal
export async function getStudentMeal(mealId: string, studentId: string, coachId: string) {
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

  return await db.meal.findFirst({
    where: {
      id: mealId,
      userId: studentId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      date: true,
      user: {
        select: {
          id: true,
          name: true,
        }
      }
    },
  })
} 