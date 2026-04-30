import { notFound } from "next/navigation"
import { type Prisma } from "@prisma/client"

import { WorkoutEditForm } from "@/components/workout/workout-edit-form"
import { db } from "@/lib/db"
import { getExercises } from "@/lib/api/workouts"

interface WorkoutPageProps {
  params: {
    workoutId: string
  }
}

type WorkoutExerciseWithExercise = Prisma.WorkoutExerciseGetPayload<{
  include: { exercise: true }
}>

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const workout = await db.workout.findFirst({
    where: {
      id: params.workoutId,
    },
    include: {
      exercises: {
        include: {
          exercise: true,
        },
      },
    },
  })

  if (!workout) {
    notFound()
  }

  const exercises = await getExercises(workout.userId)

  // Transform workout data for the form
  const workoutData = {
    id: workout.id,
    name: workout.name,
    description: workout.description,
    exercises: workout.exercises.map((we: WorkoutExerciseWithExercise) => ({
      id: we.exerciseId,
      name: we.exercise.name,
      sets: we.sets,
      reps: we.reps,
      weight: we.weight,
      notes: we.notes,
    })),
  }

  return (
    <div className="container mx-auto py-8">
      <WorkoutEditForm workout={workoutData} exercises={exercises} />
    </div>
  )
}
