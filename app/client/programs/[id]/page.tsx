"use client"

import { useEffect, useState, use } from "react"
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

export default function ClientProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [user, setUser] = useState<any>(null)
  const [program, setProgram] = useState<{ program: { id: string; name: string; description: string | null }; workouts: Workout[] } | null>(null)
  const [loading, setLoading] = useState(true)
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

  return (
    <Shell>
      <DashboardHeader heading={program.program.name} text={program.program.description || "Your workout program"}>
        <Button variant="outline" onClick={() => router.push("/client/programs")}>
          ← Back
        </Button>
      </DashboardHeader>

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

      <div className="space-y-4">
        {program.workouts.map((workout, index) => (
          <Card key={workout.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={workout.isCompleted ? "default" : "outline"}>
                    {workout.isCompleted ? "✓" : index + 1}
                  </Badge>
                  <div>
                    <CardTitle className="text-base">{workout.name}</CardTitle>
                    <CardDescription>{workout.exercises.length} exercises</CardDescription>
                  </div>
                </div>
                <Button
                  variant={workout.isCompleted ? "outline" : "default"}
                  onClick={() => startWorkout(workout.id)}
                >
                  {workout.isCompleted ? "Redo" : "Start"}
                </Button>
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
        ))}
      </div>
    </Shell>
  )
}
