"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ProgramAssignment {
  id: string
  startedAt: string
  program: {
    id: string
    name: string
    description: string | null
    organization: { id: string; name: string }
    workoutCount: number
    completedWorkoutCount: number
  }
}

export default function ClientProgramsPage() {
  const [user, setUser] = useState<any>(null)
  const [programs, setPrograms] = useState<ProgramAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/signin")
        return
      }
      setUser(currentUser)

      // Fetch client's programs
      const res = await fetch(`/api/program-assignments/client/${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        setPrograms(data)
      }
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <DashboardHeader heading="My Programs" text="Your assigned workout programs" />

      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground mb-4">No programs assigned yet</p>
            <p className="text-sm text-muted-foreground">Ask your trainer to assign you a program</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((assignment) => (
            <Card key={assignment.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{assignment.program.name}</CardTitle>
                    <CardDescription>{assignment.program.organization.name}</CardDescription>
                  </div>
                  <Badge variant="outline">
                    {assignment.program.completedWorkoutCount}/{assignment.program.workoutCount} workouts
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {assignment.program.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {assignment.program.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Started {new Date(assignment.startedAt).toLocaleDateString()}
                  </span>
                  <Button onClick={() => router.push(`/client/programs/${assignment.program.id}`)}>
                    View Program
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  )
}
