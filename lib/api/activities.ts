import { Activity, User } from "@prisma/client"
import { auth } from "@clerk/nextjs/server"

import { db } from "@/lib/db"

type UserActivities = Activity & {
  total_count: number
}

// Fetch user's activity
export async function getUserActivity(
  activityId: Activity["id"],
  userId: User["id"]
) {
  return await db.activity.findFirst({
    where: {
      id: activityId,
      userId: userId,
    },
  })
}

// Fetch all of the activities for the selected user
export async function getUserActivities(
  userId: string
): Promise<UserActivities[]> {
  const results: UserActivities[] = await db.$queryRaw`
    SELECT
      A.id,
      A.name,
      A.description,
      A.color_code AS "colorCode",
      A.scheduled_days AS "scheduledDays",
      A.target_count AS "targetCount",
      A.created_at AS "createdAt",
      SUM(AL.count) AS total_count
    FROM
      activities A
    LEFT JOIN
      activity_log AL ON A.id = AL.activity_id
    WHERE
      A.user_id = ${userId}
    GROUP BY
      A.id, A.name, A.description, A.color_code, A.scheduled_days, A.target_count
    ORDER BY
      total_count DESC;`

  return results.map((result) => ({
    ...result,
    total_count: Number(result.total_count),
    targetCount: result.targetCount ? Number(result.targetCount) : null,
  }))
}

// Verify if the user has access to the activity
export async function verifyActivity(activityId: string) {
  const { userId } = await auth()
  
  if (!userId) {
    return false
  }

  // Get the user from database
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, role: true }
  })

  if (!user) {
    return false
  }

  // First check if the activity belongs to the user directly
  const userActivity = await db.activity.count({
    where: {
      id: activityId,
      userId: user.id,
    },
  })

  if (userActivity > 0) {
    return true
  }

  // If user is a coach, check if the activity belongs to one of their students
  if (user.role === "coach") {
    const coachActivity = await db.activity.count({
      where: {
        id: activityId,
        user: {
          coachId: user.id,
        },
      },
    })
    
    return coachActivity > 0
  }

  return false
}
