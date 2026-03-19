"use client"

import * as React from "react"
import { Workout, Exercise, WorkoutExercise } from "@prisma/client"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/icons"
import { toast } from "@/components/ui/use-toast"

interface WorkoutExerciseWithExercise extends WorkoutExercise {
  exercise: Exercise
}

interface WorkoutWithExercises extends Workout {
  exercises: WorkoutExerciseWithExercise[]
}

interface SetLog {
  weight: string
  reps: string
  completed: boolean
}

interface WorkoutSessionViewProps {
  workout: WorkoutWithExercises
}

export function WorkoutSessionView({ workout }: WorkoutSessionViewProps) {
  const router = useRouter()
  const [logs, setLogs] = React.useState<Map<string, SetLog>>(new Map())

  const exercisesByCategory = workout.exercises.reduce((acc, we) => {
    const cat = we.exercise.category || "General"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(we)
    return acc
  }, {} as Record<string, WorkoutExerciseWithExercise[]>)

  const totalSets = workout.exercises.reduce((sum, we) => sum + we.sets, 0)
  const completedSets = Array.from(logs.values()).filter((l) => l.completed).length
  const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  const updateLog = (exerciseId: string, setIndex: number, field: "weight" | "reps", value: string) => {
    const key = `${exerciseId}_${setIndex}`
    const existing = logs.get(key) || { weight: "", reps: "", completed: false }
    const updated = { ...existing, [field]: value }
    const newLogs = new Map(logs)
    newLogs.set(key, updated)
    setLogs(newLogs)
  }

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    const key = `${exerciseId}_${setIndex}`
    const existing = logs.get(key) || { weight: "", reps: "", completed: false }
    const updated = { ...existing, completed: !existing.completed }
    const newLogs = new Map(logs)
    newLogs.set(key, updated)
    setLogs(newLogs)
  }

  const isExerciseComplete = (we: WorkoutExerciseWithExercise) => {
    return Array.from({ length: we.sets }, (_, i) => `${we.id}_${i}`).every(
      (key) => logs.get(key)?.completed
    )
  }

  const toggleExerciseComplete = (we: WorkoutExerciseWithExercise) => {
    const allComplete = isExerciseComplete(we)
    const newLogs = new Map(logs)
    for (let i = 0; i < we.sets; i++) {
      const key = `${we.id}_${i}`
      const existing = newLogs.get(key) || { weight: "", reps: "", completed: false }
      newLogs.set(key, { ...existing, completed: !allComplete })
    }
    setLogs(newLogs)
  }

  const completedExercises = workout.exercises.filter(isExerciseComplete).length

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{workout.name}</h2>
              {workout.description && (
                <p className="text-sm text-muted-foreground mt-1">{workout.description}</p>
              )}
            </div>
            <Badge variant="outline" className="text-sm">
              {completedExercises}/{workout.exercises.length} exercises
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {completedSets} of {totalSets} sets complete
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </div>
      </Card>

      {/* Exercise Cards by Category */}
      {Object.entries(exercisesByCategory).map(([category, exercises]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-1 w-4 rounded-full bg-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
              {category}
            </h3>
          </div>

          {exercises.map((we, exerciseIndex) => {
            const exerciseComplete = isExerciseComplete(we)

            return (
              <Card
                key={we.id}
                className={cn(
                  "overflow-hidden transition-all",
                  exerciseComplete && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="p-5">
                  {/* Exercise Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                        {exerciseIndex + 1}
                      </span>
                      <div>
                        <h4
                          className={cn(
                            "font-semibold text-lg",
                            exerciseComplete && "line-through text-muted-foreground"
                          )}
                        >
                          {we.exercise.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {we.sets} sets
                          </Badge>
                          <span className="text-muted-foreground text-xs">x</span>
                          <Badge variant="secondary" className="text-xs">
                            {we.reps} reps
                          </Badge>
                          {we.weight && (
                            <Badge variant="outline" className="text-xs">
                              {we.weight} kg
                            </Badge>
                          )}
                          {we.duration && (
                            <Badge variant="outline" className="text-xs">
                              <Icons.clock className="mr-1 h-3 w-3" />
                              {we.duration}s
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {we.exercise.muscleGroup}
                    </Badge>
                  </div>

                  {/* Set Tracking Rows */}
                  <div className="space-y-2 mb-4">
                    {Array.from({ length: we.sets }, (_, setIndex) => {
                      const key = `${we.id}_${setIndex}`
                      const log = logs.get(key)
                      const setComplete = log?.completed || false

                      return (
                        <div
                          key={setIndex}
                          className={cn(
                            "flex items-center gap-3 rounded-lg p-3 transition-colors",
                            setComplete
                              ? "bg-primary/10"
                              : "bg-muted/50"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSetComplete(we.id, setIndex)}
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                              setComplete
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 hover:border-primary"
                            )}
                            aria-label={`Toggle set ${setIndex + 1} complete`}
                          >
                            {setComplete && (
                              <Icons.check className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <span className="text-sm font-medium text-muted-foreground min-w-[50px]">
                            Set {setIndex + 1}
                          </span>
                          <div className="flex flex-1 gap-2">
                            <div className="flex-1">
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder={we.weight ? `${we.weight}` : "Weight"}
                                value={log?.weight || ""}
                                onChange={(e) => updateLog(we.id, setIndex, "weight", e.target.value)}
                                className="h-8 text-sm"
                                aria-label={`Set ${setIndex + 1} weight`}
                              />
                            </div>
                            <div className="flex-1">
                              <Input
                                type="text"
                                inputMode="numeric"
                                placeholder={`${we.reps}`}
                                value={log?.reps || ""}
                                onChange={(e) => updateLog(we.id, setIndex, "reps", e.target.value)}
                                className="h-8 text-sm"
                                aria-label={`Set ${setIndex + 1} reps`}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Notes */}
                  {we.notes && (
                    <p className="text-sm italic text-muted-foreground mb-4">{we.notes}</p>
                  )}

                  {/* Complete Exercise Button */}
                  <Button
                    type="button"
                    variant={exerciseComplete ? "default" : "outline"}
                    className={cn(
                      "w-full",
                      !exerciseComplete && "border-dashed"
                    )}
                    onClick={() => toggleExerciseComplete(we)}
                  >
                    {exerciseComplete ? (
                      <>
                        <Icons.check className="mr-2 h-4 w-4" />
                        Completed
                      </>
                    ) : (
                      "Mark as Complete"
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ))}

      {/* Finish Workout */}
      {progress === 100 && (
        <Card className="border-primary bg-primary/5 p-6 text-center">
          <Icons.fire className="mx-auto h-10 w-10 text-primary mb-3" />
          <h3 className="text-xl font-bold mb-1">Workout Complete!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Great job finishing all {workout.exercises.length} exercises.
          </p>
          <Button onClick={() => router.push("/dashboard/workouts")}>
            Back to Workouts
          </Button>
        </Card>
      )}
    </div>
  )
}
