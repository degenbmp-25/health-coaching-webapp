import { redirect } from 'next/navigation'
import { WorkoutEditForm } from "@/components/workout/workout-edit-form"
import { db } from "@/lib/db"
import { getExercises } from "@/lib/api/workouts"
import { getCurrentUser } from "@/lib/session"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"

export const dynamic = 'force-dynamic'

export default async function NewWorkoutPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/signin")
  }

  const exercises = await getExercises(user.id)

  // Get user's organization membership and videos (for video selector)
  let organizationVideos: any[] = []
  let isTrainer = false

  // Also check User.role === 'coach' since coaches manage workouts
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true }
  })

  const membership = await db.organizationMember.findFirst({
    where: {
      userId: user.id,
      role: { in: ['owner', 'trainer', 'coach'] }
    },
    include: { organization: true }
  })

  if (membership || dbUser?.role === 'coach') {
    isTrainer = true
    organizationVideos = membership
      ? await db.organizationVideo.findMany({
          where: {
            organizationId: membership.organizationId,
            status: 'ready'
          },
          orderBy: { createdAt: 'desc' }
        })
      : []
  }

  // Create empty workout data
  const workoutData = {
    id: "",
    name: "",
    description: "",
    exercises: [],
  }

  return (
    <div className="container mx-auto py-8">
      <DashboardHeader
        heading="New Workout"
        text="Create a new workout plan."
      />
      <WorkoutEditForm 
        workout={workoutData} 
        exercises={exercises}
        videos={organizationVideos}
        isTrainer={isTrainer}
      />
    </div>
  )
}
