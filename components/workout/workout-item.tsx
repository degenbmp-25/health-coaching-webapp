"use client"

import { Workout, Exercise, WorkoutExercise } from "@prisma/client"

import { WorkoutOperations } from "./workout-operations"

interface WorkoutWithExercises extends Workout {
  exercises: (WorkoutExercise & {
    exercise: Exercise
  })[]
}

interface WorkoutItemProps {
  workout: WorkoutWithExercises
}

export function WorkoutItem({ workout }: WorkoutItemProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="grid gap-1">
        <div className="font-semibold">{workout.name}</div>
        {workout.description && (
          <div className="text-sm text-muted-foreground">{workout.description}</div>
        )}
        <div className="mt-2">
          <div className="text-sm font-medium">Exercises:</div>
          <div className="mt-1 space-y-1">
            {workout.exercises.map((workoutExercise) => (
              <div key={workoutExercise.id} className="text-sm text-muted-foreground">
                {workoutExercise.exercise.name} - {workoutExercise.sets} sets × {workoutExercise.reps} reps
                {workoutExercise.weight && ` @ ${workoutExercise.weight}kg`}
                {workoutExercise.duration && ` for ${workoutExercise.duration}s`}
              </div>
            ))}
          </div>
        </div>
      </div>
      <WorkoutOperations workout={{ id: workout.id }} />
    </div>
  )
} 