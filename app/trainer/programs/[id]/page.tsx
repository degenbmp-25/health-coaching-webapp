"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { WorkoutEditForm } from "@/components/workout/workout-edit-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Settings } from "lucide-react"

interface Workout {
  id: string
  name: string
  description: string | null
  weekNumber: number | null
  dayOfWeek: number | null
  exercises: Array<{
    id: string
    exercise: { id: string; name: string }
    sets: number
    reps: number
    weight: number | null
    notes: string | null
    muxPlaybackId: string | null
    organizationVideoId: string | null
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
  startDate: string | null
  totalWeeks: number | null
  organization: { id: string; name: string; type?: string }
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

interface Exercise {
  id: string
  name: string
  category: string
  muscleGroup: string
}

interface OrganizationVideo {
  id: string
  organizationId: string
  muxAssetId: string
  muxPlaybackId: string | null
  title: string
  thumbnailUrl: string | null
  duration: number | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export default function TrainerProgramDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [user, setUser] = useState<any>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignEmail, setAssignEmail] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [removingAssignmentId, setRemovingAssignmentId] = useState<string | null>(null)
  const [addWorkoutsOpen, setAddWorkoutsOpen] = useState(false)
  const [availableWorkouts, setAvailableWorkouts] = useState<AvailableWorkout[]>([])
  const [selectedWorkoutIds, setSelectedWorkoutIds] = useState<string[]>([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(false)
  const [savingWorkouts, setSavingWorkouts] = useState(false)
  const [removingWorkoutId, setRemovingWorkoutId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [totalWeeks, setTotalWeeks] = useState<number | "">("")
  const [savingSettings, setSavingSettings] = useState(false)
  // Add workouts dialog - week/day assignment
  const [addWorkoutWeek, setAddWorkoutWeek] = useState<number | null>(null)
  const [addWorkoutDay, setAddWorkoutDay] = useState<number | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [videos, setVideos] = useState<OrganizationVideo[]>([])
  const [loadingEditorAssets, setLoadingEditorAssets] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function loadEditorAssets(organizationId: string) {
    setLoadingEditorAssets(true)
    try {
      const [exerciseRes, videosRes] = await Promise.all([
        fetch("/api/workouts/exercises"),
        fetch(`/api/organizations/${organizationId}/videos`),
      ])

      if (exerciseRes.ok) {
        setExercises(await exerciseRes.json())
      }

      if (videosRes.ok) {
        const data = await videosRes.json()
        setVideos(data.videos || [])
      }
    } finally {
      setLoadingEditorAssets(false)
    }
  }

  async function reloadProgram() {
    const res = await fetch(`/api/programs/${id}`)
    if (res.ok) {
      const data = await res.json()
      setProgram(data)
      return data as Program
    }
    return null
  }

  useEffect(() => {
    async function load() {
      const userRes = await fetch('/api/users/me')
      if (!userRes.ok) {
        router.push("/signin")
        return
      }
      const currentUser = await userRes.json()
      setUser(currentUser)

      const res = await fetch(`/api/programs/${id}`)
      if (!res.ok) {
        router.push("/trainer/programs")
        return
      }
      const data = await res.json()
      setProgram(data)
      await loadEditorAssets(data.organization.id)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function assignToClient(e: React.FormEvent) {
    e.preventDefault()
    if (!program) return

    setAssigning(true)
    
    // Find client by email
    const clientRes = await fetch(`/api/users/search?query=${encodeURIComponent(assignEmail)}`)
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

  async function removeAssignment(assignmentId: string) {
    if (!program) return

    setRemovingAssignmentId(assignmentId)

    const res = await fetch("/api/program-assignments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId }),
    })

    if (res.ok) {
      setProgram({
        ...program,
        assignments: program.assignments.filter((assignment) => assignment.id !== assignmentId),
      })
      toast({ title: "Client removed from program" })
    } else {
      let message = "Failed to remove client"
      try {
        const error = await res.json()
        message = error.error || message
      } catch {
        // Keep the fallback message when the server returns plain text.
      }
      toast({ title: message, variant: "destructive" })
    }

    setRemovingAssignmentId(null)
  }

  async function openAddWorkoutsDialog() {
    setLoadingWorkouts(true)
    setSelectedWorkoutIds([])
    setAddWorkoutWeek(null)
    setAddWorkoutDay(null)
    
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
    
    // Build addWorkouts array with week/day for each selected workout
    const addWorkouts = selectedWorkoutIds.map(wId => ({
      id: wId,
      weekNumber: addWorkoutWeek,
      dayOfWeek: addWorkoutDay,
    }))
    
    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addWorkouts }),
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

  function openSettingsDialog() {
    if (program) {
      // Format date for input (YYYY-MM-DD)
      const dateValue = program.startDate
        ? new Date(program.startDate).toISOString().split("T")[0]
        : ""
      setStartDate(dateValue)
      setTotalWeeks(program.totalWeeks ?? "")
      setSettingsOpen(true)
    }
  }

  function getWorkoutFormData(workout: Workout) {
    return {
      id: workout.id,
      name: workout.name,
      description: workout.description,
      weekNumber: workout.weekNumber,
      dayOfWeek: workout.dayOfWeek,
      exercises: workout.exercises.map((workoutExercise) => ({
        id: workoutExercise.exercise.id,
        name: workoutExercise.exercise.name,
        sets: workoutExercise.sets,
        reps: workoutExercise.reps,
        weight: workoutExercise.weight,
        notes: workoutExercise.notes,
        muxPlaybackId: workoutExercise.muxPlaybackId,
        organizationVideoId: workoutExercise.organizationVideoId,
      })),
    }
  }

  async function saveSettings() {
    if (!program) return

    setSavingSettings(true)

    const res = await fetch(`/api/programs/${program.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: startDate !== "" ? new Date(startDate).toISOString() : null,
        totalWeeks: totalWeeks !== "" && !isNaN(Number(totalWeeks)) ? Number(totalWeeks) : null,
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setProgram({
        ...program,
        startDate: updated.startDate,
        totalWeeks: updated.totalWeeks,
      })
      toast({ title: "Program settings saved" })
      setSettingsOpen(false)
    } else {
      toast({ title: "Failed to save settings", variant: "destructive" })
    }
    setSavingSettings(false)
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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={openSettingsDialog}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" onClick={() => router.push("/trainer/programs")}>
            ← Back
          </Button>
        </div>
      </DashboardHeader>

      {program.description && (
        <p className="text-muted-foreground mb-4">{program.description}</p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
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
                  <div key={workout.id} className="min-w-0 border rounded-lg p-4">
                    <div className="mb-2 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <h3 className="min-w-0 break-words font-medium">{workout.name}</h3>
                        {workout.weekNumber !== null && (
                          <Badge variant="secondary">Week {workout.weekNumber}</Badge>
                        )}
                        {workout.dayOfWeek !== null && (
                          <Badge variant="outline">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][workout.dayOfWeek]}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {workout.exercises.length} exercises
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingWorkout(workout)}
                        >
                          Edit Workout
                        </Button>
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
                      <div className="break-words text-sm text-muted-foreground">
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
                    <div key={assignment.id} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <div className="truncate">{assignment.client.name || assignment.client.email}</div>
                        <Badge variant="secondary">
                          {new Date(assignment.startedAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAssignment(assignment.id)}
                        disabled={removingAssignmentId === assignment.id}
                      >
                        {removingAssignmentId === assignment.id ? "Removing..." : "Remove"}
                      </Button>
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
            <>
              {/* Week/Day selectors - shown when workouts are selected */}
              {selectedWorkoutIds.length > 0 && (
                <div className="grid grid-cols-1 gap-3 p-3 bg-muted/50 rounded-lg mb-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Week Number</Label>
                    <Select
                      value={addWorkoutWeek === null ? "none" : String(addWorkoutWeek)}
                      onValueChange={(v) => setAddWorkoutWeek(v === "none" ? null : Number(v))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {Array.from({ length: program.totalWeeks || 12 }, (_, i) => i + 1).map(w => (
                          <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Day of Week</Label>
                    <Select
                      value={addWorkoutDay === null ? "none" : String(addWorkoutDay)}
                      onValueChange={(v) => setAddWorkoutDay(v === "none" ? null : Number(v))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                          <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
            </>
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

      {/* Program Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Program Settings</DialogTitle>
            <DialogDescription>
              Set the program start date and duration for scheduling workouts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Select start date"
              />
              <p className="text-sm text-muted-foreground">
                When the program begins. Leave empty if not yet scheduled.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalWeeks">Total Weeks</Label>
              <Input
                id="totalWeeks"
                type="number"
                min={1}
                max={52}
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g., 8"
              />
              <p className="text-sm text-muted-foreground">
                Program duration in weeks (1-52). Leave empty to auto-calculate from workouts.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editingWorkout !== null} onOpenChange={(open) => !open && setEditingWorkout(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Workout</DialogTitle>
            <DialogDescription>
              Changes here update the same workout clients see and start from their program.
            </DialogDescription>
          </DialogHeader>
          {editingWorkout ? (
            loadingEditorAssets ? (
              <div className="py-8 text-center text-muted-foreground">Loading editor...</div>
            ) : (
              <WorkoutEditForm
                workout={getWorkoutFormData(editingWorkout)}
                exercises={exercises}
                videos={videos}
                isTrainer
                submitLabel="Save Program Workout"
                onSaved={async () => {
                  await reloadProgram()
                  setEditingWorkout(null)
                }}
              />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </Shell>
  )
}
