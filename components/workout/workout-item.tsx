"use client"

import Link from "next/link"
import { Workout, Exercise, WorkoutExercise } from "@prisma/client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
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
  const muscleGroups = Array.from(
    new Set(workout.exercises.map((we) => we.exercise.muscleGroup).filter(Boolean))
  )
  const totalSets = workout.exercises.reduce((sum, we) => sum + we.sets, 0)

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/workouts/${workout.id}`}
              className="font-semibold text-lg hover:underline line-clamp-1"
            >
              {workout.name}
            </Link>
            {workout.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {workout.description}
              </p>
            )}
          </div>
          <WorkoutOperations workout={{ id: workout.id }} />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Icons.dumbbell className="h-3.5 w-3.5" />
            {workout.exercises.length} exercises
          </span>
          <span className="flex items-center gap-1">
            <Icons.statsBar className="h-3.5 w-3.5" />
            {totalSets} sets
          </span>
        </div>

        {/* Muscle Group Badges */}
        {muscleGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {muscleGroups.slice(0, 4).map((mg) => (
              <Badge key={mg} variant="secondary" className="text-xs capitalize">
                {mg}
              </Badge>
            ))}
            {muscleGroups.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{muscleGroups.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Exercise Preview */}
        <div className="space-y-1.5 mb-4">
          {workout.exercises.slice(0, 3).map((we) => (
            <div key={we.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate mr-2">{we.exercise.name}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {we.sets}x{we.reps}
                {we.weight ? ` @ ${we.weight}kg` : ""}
              </span>
            </div>
          ))}
          {workout.exercises.length > 3 && (
            <p className="text-xs text-muted-foreground">
              +{workout.exercises.length - 3} more exercises
            </p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t p-3">
        <Link href={`/dashboard/workouts/${workout.id}`} className="w-full">
          <Button variant="default" size="sm" className="w-full">
            <Icons.dumbbell className="mr-2 h-4 w-4" />
            Start Workout
          </Button>
        </Link>
      </div>
    </Card>
  )
}
