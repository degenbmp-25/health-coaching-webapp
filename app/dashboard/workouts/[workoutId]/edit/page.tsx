import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"

import { getExercises, getWorkout } from "@/lib/api/workouts"

import { WorkoutEditForm } from "@/components/workout/workout-edit-form"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { db } from "@/lib/db"

export const metadata: Metadata = {
  title: "Edit Workout",
  description: "Edit your workout plan.",
}

interface WorkoutEditPageProps {
  params: { workoutId: string }
}

export default async function WorkoutEditPage({ params }: WorkoutEditPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  const workout = await getWorkout(params.workoutId, user.id)

  if (!workout) {
    notFound()
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

  // Transform workout data for the form (include organizationVideoId)
  const workoutData = {
    id: workout.id,
    name: workout.name,
    description: workout.description,
    weekNumber: workout.weekNumber,
    dayOfWeek: workout.dayOfWeek,
    exercises: workout.exercises.map((we: any) => ({
      id: we.exerciseId,
      name: we.exercise.name,
      sets: we.sets,
      reps: we.reps,
      weight: we.weight,
      notes: we.notes,
      muxPlaybackId: we.muxPlaybackId,
      // Pass organizationVideoId so the form pre-selects the correct video
      organizationVideoId: (we as any).organizationVideoId || null,
    })),
  }

  return (
    <Shell>
      <DashboardHeader
        heading="Edit Workout"
        text="Edit your workout plan."
      />
      <div className="grid gap-10">
        <WorkoutEditForm
          workout={workoutData}
          exercises={exercises}
          videos={organizationVideos}
          isTrainer={isTrainer}
        />
      </div>
    </Shell>
  )
}
