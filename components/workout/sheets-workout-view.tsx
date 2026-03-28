"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchWorkouts, saveLog, getLogs, type Exercise, type Workout, type WorkoutLog } from '@/lib/sheets'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ErrorCard } from '@/components/ui/error-card'
import { WorkoutSkeleton } from '@/components/workout/workout-skeleton'
import { EmptyPlaceholder } from '@/components/empty-placeholder'
import { Icons } from '@/components/icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function SheetsWorkoutView() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [selectedWorkout, setSelectedWorkout] = useState<string>('Workout A')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null)
  const [logs, setLogs] = useState<Map<string, WorkoutLog>>(new Map())

  // Track which exercise we're asking for empty-confirmation
  const [pendingEmptyComplete, setPendingEmptyComplete] = useState<string | null>(null)

  const loadWorkouts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWorkouts()
      setWorkouts(data)
      // Load existing logs from localStorage
      const existingLogs = getLogs()
      const logsMap = new Map<string, WorkoutLog>()
      existingLogs.forEach(log => {
        // Use date + exerciseId as key for per-session tracking
        const key = `${log.exerciseId}_${log.date}`
        logsMap.set(key, log)
      })
      setLogs(logsMap)
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : 'Unable to load workouts. Please check your connection.',
        retry: loadWorkouts
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkouts()
  }, [loadWorkouts])

  // FIX #1: Only show workout buttons for workouts that actually exist in sheet data.
  // Never fall back to A-E if fewer than 5 workouts exist — show only what's real.
  const workoutOptions = useMemo(() => {
    if (workouts.length === 0) {
      return ['Workout A', 'Workout B', 'Workout C', 'Workout D', 'Workout E']
    }
    return workouts.map(w => w.name.replace(/\(.*\)/, '').trim())
  }, [workouts])

  const currentWorkout = useMemo(() => {
    if (!selectedWorkout) return workouts[0] ?? null
    return workouts.find(w => {
      const normalized = w.name.replace(/\(.*\)/, '').trim()
      return normalized === selectedWorkout
    }) ?? workouts[0] ?? null
  }, [workouts, selectedWorkout])

  const exercisesByCategory = useMemo(() => 
    currentWorkout?.exercises.reduce((acc, ex) => {
      const cat = ex.category || 'General'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(ex)
      return acc
    }, {} as Record<string, Exercise[]>) || {},
  [currentWorkout])

  const { completedCount, progress } = useMemo(() => {
    const exerciseCount = currentWorkout?.exercises.length || 0
    // Count unique exercises that have a completed log entry for today
    const today = new Date().toISOString().split('T')[0]
    const completedExercises = new Set<string>()
    logs.forEach((log) => {
      if (log.completed && log.date === today) {
        completedExercises.add(log.exerciseId)
      }
    })
    const completed = completedExercises.size
    const pct = exerciseCount > 0 ? Math.round((completed / exerciseCount) * 100) : 0
    return { completedCount: completed, progress: pct }
  }, [logs, currentWorkout])

  const handleWeight = (exerciseId: string, setIndex: number, value: string) => {
    const today = new Date().toISOString().split('T')[0]
    // Use date-based key to match sheets.ts API
    const key = `${exerciseId}_${today}`
    const existing = logs.get(key) || { exerciseId, date: today, weight: '', reps: '', completed: false }
    const updated = { ...existing, weight: value }
    logs.set(key, updated)
    setLogs(new Map(logs))
    saveLog(updated)
  }

  const handleReps = (exerciseId: string, setIndex: number, value: string) => {
    const today = new Date().toISOString().split('T')[0]
    // Use date-based key to match sheets.ts API
    const key = `${exerciseId}_${today}`
    const existing = logs.get(key) || { exerciseId, date: today, weight: '', reps: '', completed: false }
    const updated = { ...existing, reps: value }
    logs.set(key, updated)
    setLogs(new Map(logs))
    saveLog(updated)
  }

  const doToggleComplete = useCallback((exerciseId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const key = `${exerciseId}_${today}`
    const existing = logs.get(key)
    // FIX #2: If no log entry exists, create one with empty values before toggling
    const base = existing || { exerciseId, date: today, weight: '', reps: '', completed: false }
    const updated = { ...base, completed: !base.completed }
    logs.set(key, updated)
    setLogs(new Map(logs))
    saveLog(updated)
  }, [logs])

  // FIX #3: Intercept toggle to check for empty data before completing
  const handleToggleComplete = useCallback((exerciseId: string) => {
    const today = new Date().toISOString().split('T')[0]
    const key = `${exerciseId}_${today}`
    const existing = logs.get(key)
    // If no weight and no reps have been logged, show confirmation dialog
    const isEmpty = !existing || (existing.weight === '' && existing.reps === '')
    if (isEmpty && !existing?.completed) {
      setPendingEmptyComplete(exerciseId)
    } else {
      doToggleComplete(exerciseId)
    }
  }, [logs, doToggleComplete])

  const confirmEmptyComplete = useCallback(() => {
    if (pendingEmptyComplete) {
      doToggleComplete(pendingEmptyComplete)
      setPendingEmptyComplete(null)
    }
  }, [pendingEmptyComplete, doToggleComplete])

  if (loading) {
    return (
      <div className="space-y-4">
        <WorkoutSkeleton />
        <WorkoutSkeleton />
        <WorkoutSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorCard 
        description={error.message} 
        onRetry={error.retry} 
      />
    )
  }

  if (workouts.length === 0) {
    return (
      <EmptyPlaceholder>
        <EmptyPlaceholder.Title>No workouts found</EmptyPlaceholder.Title>
        <EmptyPlaceholder.Description>
          Add workouts to your Google Sheet to get started.
        </EmptyPlaceholder.Description>
      </EmptyPlaceholder>
    )
  }

  return (
    <div className="space-y-6">
      {/* FIX #1: Workout Selector — only renders buttons for workouts that actually exist */}
      <div className="flex flex-wrap items-center gap-2">
        {workoutOptions.map((opt) => (
          <Button
            key={opt}
            variant={selectedWorkout === opt ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedWorkout(opt)}
            className="min-w-[80px]"
          >
            {opt.replace('Workout ', '')}
          </Button>
        ))}
      </div>

      {/* Workout Focus */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{currentWorkout?.name || 'Select a workout'}</h2>
        
        {/* Progress Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{completedCount} of {currentWorkout?.exercises.length || 0} exercises complete</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Exercises by Category */}
      <div className="space-y-6">
        {Object.keys(exercisesByCategory).length === 0 ? (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Title>No exercises found</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Add exercises to {selectedWorkout} in your Google Sheet
            </EmptyPlaceholder.Description>
          </EmptyPlaceholder>
        ) : (
          Object.entries(exercisesByCategory).map(([category, exercises]) => (
            <div key={category} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center gap-2">
                <div className="h-1 w-4 rounded-full bg-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">{category}</h3>
              </div>

              {exercises.map((exercise, i) => {
                const today = new Date().toISOString().split('T')[0]
                // Use date-based key to match sheets.ts API
                const logKey = `${exercise.id}_${today}`
                const log = logs.get(logKey)
                const isCompleted = log?.completed || false

                return (
                  <Card 
                    key={exercise.id} 
                    className={`overflow-hidden ${isCompleted ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Exercise Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="font-mono">
                              {i + 1}
                            </Badge>
                            <span className="font-semibold">{exercise.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{exercise.sets} sets</span>
                            <span>×</span>
                            <span>{exercise.reps}</span>
                          </div>
                        </div>
                        {exercise.tempo && (
                          <Badge variant="secondary" className="shrink-0">
                            Tempo: {exercise.tempo}
                          </Badge>
                        )}
                      </div>

                      {/* Video Placeholder */}
                      <div className="rounded-md border bg-muted/50 p-4">
                        {exercise.videoUrl ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icons.activity className="h-4 w-4" />
                            <span className="truncate">{exercise.videoUrl}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icons.image className="h-4 w-4" />
                            <span>Demo video placeholder</span>
                          </div>
                        )}
                      </div>

                      {/* Sets Container */}
                      <div className="space-y-3">
                        {Array.from({ length: exercise.sets }, (_, setIndex) => {
                          return (
                            <div key={setIndex} className="flex items-center gap-3">
                              <span className="shrink-0 text-sm font-medium text-muted-foreground w-16">
                                Set {setIndex + 1}
                              </span>
                              <div className="flex flex-1 items-center gap-2">
                                <div className="flex-1 space-y-1">
                                  <label className="text-xs text-muted-foreground">Weight</label>
                                  <Input
                                    type="text"
                                    placeholder={exercise.load[setIndex] || '-'}
                                    value={setIndex === 0 ? (log?.weight || '') : ''}
                                    onChange={(e) => handleWeight(exercise.id, setIndex, e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <label className="text-xs text-muted-foreground">Reps</label>
                                  <Input
                                    type="text"
                                    placeholder={exercise.reps}
                                    value={setIndex === 0 ? (log?.reps || '') : ''}
                                    onChange={(e) => handleReps(exercise.id, setIndex, e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {exercise.rest && (
                          <p className="text-xs text-muted-foreground">Rest: {exercise.rest}</p>
                        )}
                      </div>

                      {/* Notes */}
                      {exercise.notes && !exercise.videoUrl && (
                        <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                      )}

                      {/* Complete Button — FIX #3: uses handleToggleComplete for empty-data guard */}
                      <Button
                        variant={isCompleted ? "default" : "outline"}
                        className="w-full"
                        onClick={() => handleToggleComplete(exercise.id)}
                      >
                        {isCompleted ? (
                          <>
                            <Icons.check className="mr-2 h-4 w-4" />
                            Completed
                          </>
                        ) : (
                          'Mark as Complete'
                        )}
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* FIX #3: Alert dialog when trying to complete with no weight/reps data */}
      <AlertDialog open={pendingEmptyComplete !== null} onOpenChange={(open) => !open && setPendingEmptyComplete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No data logged</AlertDialogTitle>
            <AlertDialogDescription>
              You haven&apos;t entered any weight or reps for this exercise. Marking it complete will save an empty log entry with no performance data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEmptyComplete}>
              Complete Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
