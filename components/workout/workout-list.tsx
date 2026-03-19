"use client"

import { Workout, Exercise, WorkoutExercise } from "@prisma/client"

import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { Icons } from "@/components/icons"

import { WorkoutItem } from "./workout-item"

interface WorkoutWithExercises extends Workout {
  exercises: (WorkoutExercise & {
    exercise: Exercise
  })[]
}

interface WorkoutListProps {
  workouts: WorkoutWithExercises[]
}

export function WorkoutList({ workouts }: WorkoutListProps) {
  if (!workouts?.length) {
    return (
      <EmptyPlaceholder>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Icons.dumbbell className="h-10 w-10" />
        </div>
        <EmptyPlaceholder.Title>No workouts created</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          Create your first workout plan to get started.
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {workouts.map((workout) => (
        <WorkoutItem key={workout.id} workout={workout} />
      ))}
    </div>
  )
}
