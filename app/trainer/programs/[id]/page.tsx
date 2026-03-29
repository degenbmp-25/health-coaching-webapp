"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

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

export default function TrainerProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [user, setUser] = useState<any>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [loading, setLoading] = useState(true)
  const [assignEmail, setAssignEmail] = useState("")
  const [assigning, setAssigning] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

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
            <CardTitle>Workouts in Program</CardTitle>
            <CardDescription>{program.workouts.length} workouts</CardDescription>
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
                      <span className="text-sm text-muted-foreground">
                        {workout.exercises.length} exercises
                      </span>
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
    </Shell>
  )
}
