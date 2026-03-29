"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"

interface Organization {
  id: string
  name: string
  type: string
  userRole: string
  members: Array<{
    id: string
    role: string
    user: { id: string; name: string | null; email: string; image: string | null }
  }>
  programs: Array<{
    id: string
    name: string
    description: string | null
    createdBy: { id: string; name: string | null }
    _count: { workouts: number; assignments: number }
  }>
  sheetConnections: Array<{
    id: string
    sheetUrl: string
    trainer: { id: string; name: string | null; email: string }
  }>
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
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

      const res = await fetch(`/api/organizations/${id}`)
      if (!res.ok) {
        router.push("/admin/organizations")
        return
      }
      const data = await res.json()
      setOrganization(data)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function removeMember(memberId: string) {
    const res = await fetch(`/api/organizations/${id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: memberId }),
    })

    if (res.ok) {
      setOrganization((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.user.id !== memberId) } : null
      )
      toast({ title: "Member removed" })
    }
  }

  if (loading || !organization) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </Shell>
    )
  }

  const isOwner = organization.userRole === "owner"

  return (
    <Shell>
      <DashboardHeader
        heading={organization.name}
        text={`${organization.type === "gym" ? "Gym" : "Personal Training"} • ${organization.userRole}`}
      >
        {isOwner && (
          <Button variant="outline" onClick={() => router.push(`/admin/organizations/${id}/members`)}>
            Manage Members
          </Button>
        )}
      </DashboardHeader>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="sheets">Sheet Connections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>{organization.members.length} members</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {organization.members.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {member.user.image ? (
                            <img src={member.user.image} className="w-8 h-8 rounded-full" />
                          ) : (
                            <span className="text-xs">{member.user.name?.[0] || member.user.email[0]}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{member.user.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{member.role}</Badge>
                    </div>
                  ))}
                </div>
                {organization.members.length > 5 && (
                  <Button variant="ghost" className="w-full mt-2" onClick={() => router.push(`/admin/organizations/${id}/members`)}>
                    View all {organization.members.length} members
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Programs</CardTitle>
                <CardDescription>{organization.programs.length} programs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {organization.programs.slice(0, 5).map((program) => (
                    <div key={program.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{program.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {program._count.workouts} workouts • {program._count.assignments} clients
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {organization.programs.length > 5 && (
                  <Button variant="ghost" className="w-full mt-2" onClick={() => router.push(`/admin/organizations/${id}/programs`)}>
                    View all {organization.programs.length} programs
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Organization Programs</h2>
            <Button onClick={() => router.push(`/admin/organizations/${id}/programs`)}>
              Manage Programs
            </Button>
          </div>
          {organization.programs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-32">
                <p className="text-muted-foreground">No programs yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {organization.programs.map((program) => (
                <Card key={program.id}>
                  <CardHeader>
                    <CardTitle>{program.name}</CardTitle>
                    {program.description && <CardDescription>{program.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{program._count.workouts} workouts</span>
                      <span>{program._count.assignments} clients assigned</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sheets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Sheet Connections</CardTitle>
              <CardDescription>Trainers can connect their Google Sheets to sync workout data</CardDescription>
            </CardHeader>
            <CardContent>
              {organization.sheetConnections.length === 0 ? (
                <p className="text-muted-foreground">No sheets connected</p>
              ) : (
                <div className="space-y-2">
                  {organization.sheetConnections.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{conn.trainer.name || conn.trainer.email}</p>
                        <a href={conn.sheetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                          {conn.sheetUrl}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Shell>
  )
}
