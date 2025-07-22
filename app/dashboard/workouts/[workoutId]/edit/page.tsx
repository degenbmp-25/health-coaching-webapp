import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { getWorkout } from "@/lib/api/workouts"
import { getCurrentUser } from "@/lib/session"
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

  // Transform workout data for the form
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
        />
      </div>
    </Shell>
  )
} 