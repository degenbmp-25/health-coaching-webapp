"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Workout {
  id: string
  name: string
  description: string | null
  weekNumber: number | null
  dayOfWeek: number | null
  scheduledDate: string | null
  exercises: Array<{
    id: string
    exercise: { id: string; name: string; category: string; muscleGroup: string | null }
    sets: number
    reps: number
    weight: number | null
    order: number
  }>
  isCompleted: boolean
  sessionCount: number
}

interface GroupedWorkouts {
  [week: number]: Workout[]
}

interface ProgramData {
  program: {
    id: string
    name: string
    description: string | null
    startDate: string | null
    totalWeeks: number | null
  }
  workouts: Workout[]
  groupedByWeek: GroupedWorkouts | null
  currentWeek: number | null
}

export default function ClientProgramDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [user, setUser] = useState<any>(null)
  const [program, setProgram] = useState<ProgramData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const userRes = await fetch("/api/users/me")
      if (!userRes.ok) {
        router.push("/signin")
        return
      }
      const currentUser = await userRes.json()
      if (!currentUser) {
        router.push("/signin")
        return
      }
      setUser(currentUser)

      const res = await fetch(`/api/workouts/program/${id}`)
      if (!res.ok) {
        router.push("/client/programs")
        return
      }
      const data = await res.json()
      setProgram(data)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function startWorkout(workoutId: string) {
    const res = await fetch("/api/workout-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutId }),
    })

    if (res.ok) {
      const session = await res.json()
      router.push(`/dashboard/workouts/${session.id}`)
    }
  }

  if (loading || !program) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </Shell>
    )
  }

  const completedCount = program.workouts.filter((w) => w.isCompleted).length
  const progress = program.workouts.length > 0
    ? Math.round((completedCount / program.workouts.length) * 100)
    : 0

  // Get unique weeks for filter
  const weekSet = new Set<number>()
  program.workouts.forEach((w) => weekSet.add(w.weekNumber ?? 0))
  const weeks = Array.from(weekSet).sort((a, b) => a - b)

  // Determine which workouts to show based on filter
  const displayedWorkouts = selectedWeek !== null
    ? program.workouts.filter((w) => (w.weekNumber ?? 0) === selectedWeek)
    : program.workouts

  // Group displayed workouts by week for rendering
  const displayedGrouped: GroupedWorkouts = {}
  for (const workout of displayedWorkouts) {
    const week = workout.weekNumber ?? 0
    if (!displayedGrouped[week]) {
      displayedGrouped[week] = []
    }
    displayedGrouped[week].push(workout)
  }

  const weekNames: Record<number, string> = {
    0: "Unassigned",
  }
  for (let i = 1; i <= 52; i++) {
    weekNames[i] = `Week ${i}`
  }

  return (
    <Shell>
      <DashboardHeader heading={program.program.name} text={program.program.description || "Your workout program"}>
        <Button variant="outline" onClick={() => router.push("/client/programs")}>
          ← Back
        </Button>
      </DashboardHeader>

      {/* Week X of Y Progress Banner */}
      {program.currentWeek !== null && program.program.totalWeeks !== null && (
        <Card className="mb-4 border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {program.currentWeek > program.program.totalWeeks
                    ? "Program Complete!"
                    : `Currently Week ${program.currentWeek} of ${program.program.totalWeeks}`}
                </p>
                {program.program.startDate && (
                  <p className="text-sm text-muted-foreground">
                    Started {new Date(program.program.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              {program.currentWeek <= program.program.totalWeeks && (
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {program.currentWeek} / {program.program.totalWeeks}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not started banner for programs with future start dates */}
      {program.currentWeek === null && program.program.startDate && program.program.totalWeeks !== null && (
        <Card className="mb-4 border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Program starts {new Date(program.program.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                <p className="text-sm text-muted-foreground">Get ready! Your workout program will begin soon.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>
            {completedCount} of {program.workouts.length} workouts completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-right text-sm text-muted-foreground mt-1">{progress}%</p>
        </CardContent>
      </Card>

      {/* Week Filter */}
      {weeks.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={selectedWeek === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedWeek(null)}
          >
            All Weeks
          </Button>
          {weeks.map((week) => (
            <Button
              key={week}
              variant={selectedWeek === week ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedWeek(week)}
            >
              {weekNames[week] || `Week ${week}`}
            </Button>
          ))}
        </div>
      )}

      {/* Workouts grouped by week */}
      <div className="space-y-6">
        {Object.entries(displayedGrouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([week, workouts]) => (
            <div key={week}>
              {selectedWeek === null && (
                <h2 className="text-lg font-semibold mb-3">
                  {weekNames[Number(week)] || `Week ${week}`}
                </h2>
              )}
              <div className="space-y-4">
                {workouts.map((workout: Workout, index: number) => {
                  // Find global index for display
                  const globalIndex = program.workouts.findIndex((w) => w.id === workout.id)
                  // Calculate workout date
                  let workoutDate: string | null = null
                  let workoutDateObj: Date | null = null
                  if (workout.scheduledDate) {
                    workoutDateObj = new Date(workout.scheduledDate)
                    workoutDate = workoutDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  } else if (program.program.startDate && workout.weekNumber !== null) {
                    const start = new Date(program.program.startDate)
                    const daysToAdd = (workout.weekNumber - 1) * 7 + (workout.dayOfWeek ?? 0)
                    workoutDateObj = new Date(start.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
                    workoutDate = workoutDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }
                  // Check if this is today's workout (locale-independent comparison)
                  const today = new Date()
                  const isToday = workoutDateObj !== null &&
                    workoutDateObj.getFullYear() === today.getFullYear() &&
                    workoutDateObj.getMonth() === today.getMonth() &&
                    workoutDateObj.getDate() === today.getDate()
                  return (
                    <Card key={workout.id} className={isToday ? "border-primary/50" : ""}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={workout.isCompleted ? "default" : "outline"}>
                              {workout.isCompleted ? "✓" : globalIndex + 1}
                            </Badge>
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-base">{workout.name}</CardTitle>
                                {workout.weekNumber !== null && (
                                  <Badge variant="secondary" className="text-xs">
                                    Week {workout.weekNumber}
                                  </Badge>
                                )}
                              </div>
                              <CardDescription>
                                {workout.exercises.length} exercises
                                {workoutDate && ` • ${workoutDate}`}
                                {!workoutDate && workout.dayOfWeek !== null && ` • ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][workout.dayOfWeek]}`}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isToday && <Badge variant="secondary">Today</Badge>}
                            <Button
                              variant={workout.isCompleted ? "outline" : "default"}
                              onClick={() => startWorkout(workout.id)}
                            >
                              {workout.isCompleted ? "Redo" : "Start"}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {workout.exercises.map((ex) => (
                            <div key={ex.id} className="flex justify-between text-sm">
                              <span>{ex.exercise.name}</span>
                              <span className="text-muted-foreground">
                                {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}lbs` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
      </div>
    </Shell>
  )
}
