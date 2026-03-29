"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface Organization {
  id: string
  name: string
  type: string
  userRole: string
  memberCount: number
  trainerCount: number
  programCount: number
  createdAt: string
}

export default function AdminOrganizationsPage() {
  const [user, setUser] = useState<any>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [newOrgType, setNewOrgType] = useState<"gym" | "personal">("personal")
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

      // Fetch organizations
      const res = await fetch("/api/organizations")
      if (res.ok) {
        const data = await res.json()
        setOrganizations(data)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function createOrganization(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOrgName, type: newOrgType }),
    })

    if (res.ok) {
      const org = await res.json()
      setOrganizations([...organizations, { ...org, userRole: "owner", memberCount: 1, trainerCount: 0, programCount: 0 }])
      setIsCreateOpen(false)
      setNewOrgName("")
      setNewOrgType("personal")
      router.push(`/admin/organizations/${org.id}`)
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <DashboardHeader heading="Organizations" text="Manage your fitness businesses">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Organization</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <form onSubmit={createOrganization} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="My Fitness Studio"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={newOrgType} onValueChange={(v: "gym" | "personal") => setNewOrgType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Training</SelectItem>
                    <SelectItem value="gym">Gym / Studio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground mb-4">No organizations yet</p>
            <Button onClick={() => setIsCreateOpen(true)}>Create Your First Organization</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {org.name}
                  <Badge variant={org.type === "gym" ? "default" : "secondary"}>
                    {org.type}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Created {new Date(org.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Your Role</span>
                    <Badge variant="outline">{org.userRole}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span>{org.memberCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trainers</span>
                    <span>{org.trainerCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Programs</span>
                    <span>{org.programCount}</span>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  variant="secondary"
                  onClick={() => router.push(`/admin/organizations/${org.id}`)}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  )
}
