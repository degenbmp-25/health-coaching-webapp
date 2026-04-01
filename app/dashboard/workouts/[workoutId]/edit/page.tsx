import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"

import { getWorkout } from "@/lib/api/workouts"

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

  // Fetch all exercises
  const exercises = await db.exercise.findMany({
    orderBy: {
      name: 'asc',
    },
  })

  // Get user's organization membership and videos (for video selector)
  let organizationVideos: any[] = []
  let isTrainer = false

  // CRITICAL FIX: user.id from Clerk is Clerk ID (user_xxx), but OrganizationMember.userId is DB CUID
  // Must resolve Clerk ID -> DB user first, then use DB CUID for membership lookup
  const dbUser = await db.user.findFirst({
    where: { clerkId: user.id },
    select: { id: true, role: true }
  })

  const membership = dbUser ? await db.organizationMember.findFirst({
    where: {
      userId: dbUser.id,  // Use DB CUID, not Clerk ID
      role: { in: ['owner', 'trainer', 'coach'] }
    },
    include: { organization: true }
  }) : null

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

  // Transform workout data for the form (include muxPlaybackId)
  const workoutData = {
    id: workout.id,
    name: workout.name,
    description: workout.description,
    exercises: workout.exercises.map(we => ({
      id: we.exerciseId,
      name: we.exercise.name,
      sets: we.sets,
      reps: we.reps,
      weight: we.weight,
      notes: we.notes,
      muxPlaybackId: we.muxPlaybackId,
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
