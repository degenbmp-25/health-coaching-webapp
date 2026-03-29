"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ClientData {
  id: string
  name: string | null
  email: string
  image: string | null
  organizationRole: string | null
  primaryTrainerId: string | null
  programAssignments: Array<{
    id: string
    program: {
      id: string
      name: string
      description: string | null
      workouts: Array<{ id: string; name: string }>
    }
    startedAt: string
  }>
  workoutSessions: Array<{
    id: string
    workout: { name: string }
    status: string
    completedAt: string | null
    startedAt: string
  }>
}

export default function TrainerClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [user, setUser] = useState<any>(null)
  const [client, setClient] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const userRes = await fetch('/api/users/me')
      if (!userRes.ok) {
        router.push("/signin")
        return
      }
      const currentUser = await userRes.json()
      setUser(currentUser)

      // Fetch client details
      const res = await fetch(`/api/users/${id}`)
      if (!res.ok) {
        router.push("/trainer/clients")
        return
      }
      const data = await res.json()
      setClient(data)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function assignProgram(programId: string) {
    const res = await fetch("/api/program-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId, clientId: id }),
    })

    if (res.ok) {
      // Refresh client data
      const refreshRes = await fetch(`/api/users/${id}`)
      if (refreshRes.ok) {
        setClient(await refreshRes.json())
      }
    }
  }

  if (loading || !client) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <DashboardHeader heading={client.name || client.email} text={client.email}>
        <Button variant="outline" onClick={() => router.push("/trainer/clients")}>
          ← Back
        </Button>
      </DashboardHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                {client.image ? (
                  <img src={client.image} className="w-16 h-16 rounded-full" />
                ) : (
                  <span className="text-2xl">{client.name?.[0] || client.email[0]}</span>
                )}
              </div>
              <div>
                <p className="font-medium text-lg">{client.name || "Unknown"}</p>
                <p className="text-muted-foreground">{client.email}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="outline">{client.organizationRole || "client"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Primary Trainer</span>
                <span>{client.primaryTrainerId === user?.id ? "You" : "Other"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Last 5 workout sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {client.workoutSessions.length === 0 ? (
              <p className="text-muted-foreground">No workouts yet</p>
            ) : (
              <div className="space-y-2">
                {client.workoutSessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{session.workout.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.startedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Assigned Programs</CardTitle>
          <CardDescription>Programs this client has access to</CardDescription>
        </CardHeader>
        <CardContent>
          {client.programAssignments.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">No programs assigned</p>
              <Button variant="outline" onClick={() => router.push("/trainer/programs")}>
                Assign a Program
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {client.programAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div>
                    <p className="font-medium">{assignment.program.name}</p>
                    {assignment.program.description && (
                      <p className="text-sm text-muted-foreground">{assignment.program.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Started {new Date(assignment.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/client/programs/${assignment.program.id}`)}
                  >
                    View →
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Shell>
  )
}
