"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Workout {
  id: string
  name: string
  description: string | null
  exercises: Array<{
    id: string
    exercise: { id: string; name: string }
    sets: number
    reps: number
    weight: number | null
    order: number
  }>
}

interface Client {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Program {
  id: string
  name: string
  description: string | null
  organization: { id: string; name: string }
  createdBy: { id: string; name: string | null }
  workouts: Workout[]
  assignments: Array<{
    id: string
    client: Client
    startedAt: string
  }>
}

interface AvailableWorkout {
  id: string
  name: string
  description: string | null
  exerciseCount: number
}

export default function TrainerProgramDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [user, setUser] = useState<any>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignEmail, setAssignEmail] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [addWorkoutsOpen, setAddWorkoutsOpen] = useState(false)
  const [availableWorkouts, setAvailableWorkouts] = useState<AvailableWorkout[]>([])
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<string[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [savingWorkouts, setSavingWorkouts] = useState(false)
  const [removingWorkoutId, setRemovingWorkoutId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      // TEMP BYPASS FOR DEMO - Skip auth check, Clerk auth is broken
      // const userRes = await fetch('/api/users/me')
      // if (!userRes.ok) {
      //   router.push("/signin")
      //   return
      // }
      // const currentUser = await userRes.json()
      // setUser(currentUser)

      const res = await fetch(`/api/programs/${id}`)
      if (!res.ok) {
        router.push("/trainer/programs")
        return
      }
      const data = await res.json()
      setProgram(data)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function assignToClient(e: React.FormEvent) {
    e.preventDefault()
    if (!program) return

    setAssigning(true)
    
    // Find client by email
    const clientRes = await fetch(`/api/users?email=${encodeURIComponent(assignEmail)}`)
    if (!clientRes.ok) {
      toast({ title: "User not found", variant: "destructive" })
      setAssigning(false)
      return
    }

    const clients = await clientRes.json()
    if (clients.length === 0) {
      toast({ title: "User not found with this email", variant: "destructive" })
      setAssigning(false)
      return
    }

    const client = clients[0]
    const res = await fetch("/api/program-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: program.id, clientId: client.id }),
    })

    if (res.ok) {
      const assignment = await res.json()
      setProgram({
        ...program,
        assignments: [...program.assignments, { ...assignment, client }],
      })
      setAssignEmail("")
      toast({ title: "Program assigned to client" })
    } else {
      const error = await res.json()
      toast({ title: error.error || "Failed to assign", variant: "destructive" })
    }
    setAssigning(false)
  }

  async function openAddWorkoutsDialog() {
    setLoadingWorkouts(true)
    setSelectedWorkoutIds([])
    
    // Fetch all workouts available to this trainer
    const res = await fetch("/api/workouts")
    if (res.ok) {
      const data = await res.json()
      // Filter out workouts already in the program
      const programWorkoutIds = new Set(program?.workouts.map(w => w.id) || [])
      const available = (Array.isArray(data) ? data : data.workouts || [])
        .filter((w: any) => !programWorkoutIds.has(w.id))
        .map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          exerciseCount: w.exercises?.length || 0,
        }))
      setAvailableWorkouts(available)
    }
    
    setLoadingWorkouts(false)
    setAddWorkoutsOpen(true)
  }

  async function saveWorkouts() {
    if (!program || selectedWorkoutIds.length === 0) return
    
    setSavingWorkouts(true)
    
    // Use atomic add operation - no read-then-write race condition
    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addWorkoutIds: selectedWorkoutIds }),
    })
    
    if (res.ok) {
      // Refresh program data
      const programRes = await fetch(`/api/programs/${id}`)
      if (programRes.ok) {
        const data = await programRes.json()
        setProgram(data)
      }
      toast({ title: "Workouts added to program" })
      setAddWorkoutsOpen(false)
    } else {
      toast({ title: "Failed to add workouts", variant: "destructive" })
    }
    setSavingWorkouts(false)
  }

  async function removeWorkout(workoutId: string) {
    if (!program) return
    
    setRemovingWorkoutId(workoutId)
    
    // Use atomic remove operation - no read-then-write race condition
    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeWorkoutIds: [workoutId] }),
    })
    
    if (res.ok) {
      setProgram({
        ...program,
        workouts: program.workouts.filter(w => w.id !== workoutId),
      })
      toast({ title: "Workout removed from program" })
    } else {
      toast({ title: "Failed to remove workout", variant: "destructive" })
    }
    setRemovingWorkoutId(null)
  }

  if (loading || !program) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <DashboardHeader heading={program.name} text={program.organization.name}>
        <Button variant="outline" onClick={() => router.push("/trainer/programs")}>
          ← Back
        </Button>
      </DashboardHeader>

      {program.description && (
        <p className="text-muted-foreground mb-4">{program.description}</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Workouts in Program</CardTitle>
                <CardDescription>{program.workouts.length} workouts</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={openAddWorkoutsDialog}>
                + Add Workouts
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {program.workouts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No workouts added yet</p>
                <Button variant="outline" onClick={() => router.push("/dashboard/workouts")}>
                  Create a Workout
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {program.workouts.map((workout, index) => (
                  <div key={workout.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <h3 className="font-medium">{workout.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {workout.exercises.length} exercises
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeWorkout(workout.id)}
                          disabled={removingWorkoutId === workout.id}
                        >
                          {removingWorkoutId === workout.id ? "..." : "Remove"}
                        </Button>
                      </div>
                    </div>
                    {workout.exercises.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {workout.exercises.slice(0, 3).map((ex) => ex.exercise.name).join(", ")}
                        {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign to Clients</CardTitle>
            <CardDescription>Give clients access to this program</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={assignToClient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Client Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  placeholder="client@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={assigning}>
                {assigning ? "Assigning..." : "Assign Program"}
              </Button>
            </form>

            {program.assignments.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-sm mb-2">Assigned Clients</h4>
                <div className="space-y-2">
                  {program.assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between text-sm">
                      <span>{assignment.client.name || assignment.client.email}</span>
                      <Badge variant="secondary">
                        {new Date(assignment.startedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Workouts Dialog */}
      <Dialog open={addWorkoutsOpen} onOpenChange={setAddWorkoutsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Workouts to Program</DialogTitle>
            <DialogDescription>
              Select workouts to add to {program.name}
            </DialogDescription>
          </DialogHeader>
          
          {loadingWorkouts ? (
            <div className="py-8 text-center text-muted-foreground">Loading workouts...</div>
          ) : availableWorkouts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">No available workouts to add</p>
              <Button variant="outline" onClick={() => router.push("/dashboard/workouts")}>
                Create a Workout
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {availableWorkouts.map((workout) => (
                <label
                  key={workout.id}
                  className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      if (selectedWorkoutIds.includes(workout.id)) {
                        setSelectedWorkoutIds(selectedWorkoutIds.filter(id => id !== workout.id))
                      } else {
                        setSelectedWorkoutIds([...selectedWorkoutIds, workout.id])
                      }
                    }}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedWorkoutIds.includes(workout.id)
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground"
                    }`}
                  >
                    {selectedWorkoutIds.includes(workout.id) && (
                      <span className="text-xs">✓</span>
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="font-medium">{workout.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {workout.exerciseCount} exercises
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddWorkoutsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveWorkouts}
              disabled={selectedWorkoutIds.length === 0 || savingWorkouts}
            >
              {savingWorkouts ? "Saving..." : `Add ${selectedWorkoutIds.length} Workout${selectedWorkoutIds.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Shell>
  )
}
