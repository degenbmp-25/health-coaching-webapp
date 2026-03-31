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
import { VideoPlayer } from "@/components/workout/mux-player"

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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function WorkoutSessionView({ workout }: WorkoutSessionViewProps) {
  const router = useRouter()
  const [logs, setLogs] = React.useState<Map<string, SetLog>>(new Map())
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isCompleting, setIsCompleting] = React.useState(false)
  const debouncedLogs = useDebounce(logs, 1000)
  const initializedRef = React.useRef(false)

  // Create or resume a session on mount
  React.useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch("/api/workout-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workoutId: workout.id }),
        })
        if (!res.ok) return
        const data = await res.json()
        setSessionId(data.id)

        // Restore set logs from existing session
        if (data.setLogs && data.setLogs.length > 0) {
          const restored = new Map<string, SetLog>()
          for (const log of data.setLogs) {
            const key = `${log.workoutExerciseId}_${log.setNumber}`
            restored.set(key, {
              weight: log.weight != null ? String(log.weight) : "",
              reps: log.reps != null ? String(log.reps) : "",
              completed: log.completed,
            })
          }
          setLogs(restored)
        }
        initializedRef.current = true
      } catch {
        initializedRef.current = true
      }
    }
    initSession()
  }, [workout.id])

  // Auto-save set logs whenever they change (debounced)
  React.useEffect(() => {
    if (!sessionId || !initializedRef.current || debouncedLogs.size === 0) return

    async function saveSets() {
      setIsSaving(true)
      try {
        const sets = Array.from(debouncedLogs.entries()).map(([key, log]) => {
          const [workoutExerciseId, setNumberStr] = key.split("_")
          return {
            workoutExerciseId,
            setNumber: parseInt(setNumberStr, 10),
            weight: log.weight ? parseFloat(log.weight) : null,
            reps: log.reps ? parseInt(log.reps, 10) : null,
            completed: log.completed,
          }
        })
        await fetch(`/api/workout-sessions/${sessionId}/sets`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sets }),
        })
      } catch {
        // Silent fail — data is still in state
      } finally {
        setIsSaving(false)
      }
    }
    saveSets()
  }, [debouncedLogs, sessionId])

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
    const newLogs = new Map(logs)
    newLogs.set(key, { ...existing, [field]: value })
    setLogs(newLogs)
  }

  const toggleSetComplete = (exerciseId: string, setIndex: number) => {
    const key = `${exerciseId}_${setIndex}`
    const existing = logs.get(key) || { weight: "", reps: "", completed: false }
    const newLogs = new Map(logs)
    newLogs.set(key, { ...existing, completed: !existing.completed })
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

  const handleFinishWorkout = async () => {
    setIsCompleting(true)
    try {
      if (sessionId && logs.size > 0) {
        const sets = Array.from(logs.entries()).map(([key, log]) => {
          const [workoutExerciseId, setNumberStr] = key.split("_")
          return {
            workoutExerciseId,
            setNumber: parseInt(setNumberStr, 10),
            weight: log.weight ? parseFloat(log.weight) : null,
            reps: log.reps ? parseInt(log.reps, 10) : null,
            completed: log.completed,
          }
        })
        await fetch(`/api/workout-sessions/${sessionId}/sets`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sets }),
        })
        await fetch(`/api/workout-sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        })
      }
      toast({ title: "Workout saved!", description: "Your session has been recorded." })
      router.push("/dashboard/workouts")
    } catch {
      toast({
        title: "Error saving workout",
        description: "Your progress may not have saved. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCompleting(false)
    }
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
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icons.spinner className="h-3 w-3 animate-spin" />
                  Saving…
                </span>
              )}
              <Badge variant="outline" className="text-sm">
                {completedExercises}/{workout.exercises.length} exercises
              </Badge>
            </div>
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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                        {exerciseIndex + 1}
                      </span>
                      <div>
                        <h4 className={cn("font-semibold text-lg", exerciseComplete && "line-through text-muted-foreground")}>
                          {we.exercise.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{we.sets} sets</Badge>
                          <span className="text-muted-foreground text-xs">x</span>
                          <Badge variant="secondary" className="text-xs">{we.reps} reps</Badge>
                          {we.weight && <Badge variant="outline" className="text-xs">{we.weight} kg</Badge>}
                          {we.duration && (
                            <Badge variant="outline" className="text-xs">
                              <Icons.clock className="mr-1 h-3 w-3" />
                              {we.duration}s
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">{we.exercise.muscleGroup}</Badge>
                  </div>

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
                            setComplete ? "bg-primary/10" : "bg-muted/50"
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
                            {setComplete && <Icons.check className="h-3.5 w-3.5" />}
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

                  {/* Video Section - use muxPlaybackId if available */}
                  {we.muxPlaybackId ? (
                    <div className="mb-4">
                      <VideoPlayer playbackId={we.muxPlaybackId} title={we.exercise.name} />
                    </div>
                  ) : we.notes ? (
                    <p className="text-sm italic text-muted-foreground mb-4">{we.notes}</p>
                  ) : null}

                  <Button
                    type="button"
                    variant={exerciseComplete ? "default" : "outline"}
                    className={cn("w-full", !exerciseComplete && "border-dashed")}
                    onClick={() => toggleExerciseComplete(we)}
                  >
                    {exerciseComplete ? (
                      <><Icons.check className="mr-2 h-4 w-4" />Completed</>
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
          <Button onClick={handleFinishWorkout} disabled={isCompleting}>
            {isCompleting ? (
              <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" />Saving…</>
            ) : (
              "Save & Finish"
            )}
          </Button>
        </Card>
      )}
    </div>
  )
}
