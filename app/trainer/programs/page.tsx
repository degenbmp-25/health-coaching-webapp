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
import { useToast } from "@/components/ui/use-toast"

interface Program {
  id: string
  name: string
  description: string | null
  organization: { id: string; name: string }
  createdBy: { id: string; name: string | null }
  _count: { workouts: number; assignments: number }
  createdAt: string
}

export default function TrainerProgramsPage() {
  const [user, setUser] = useState<any>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newProgramName, setNewProgramName] = useState("")
  const [newProgramDesc, setNewProgramDesc] = useState("")
  const [newProgramOrg, setNewProgramOrg] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      // TEMP BYPASS FOR DEMO - skip auth check
      // const userRes = await fetch("/api/users/me")
      // if (!userRes.ok) {
      //   router.push("/signin")
      //   return
      // }
      // const currentUser = await userRes.json()
      // if (!currentUser) {
      //   router.push("/signin")
      //   return
      // }
      // setUser(currentUser)
      
      // For demo, use mock user
      setUser({ id: "demo", name: "Demo User", email: "demo@example.com" })

      // Fetch organizations
      const orgRes = await fetch("/api/organizations")
      if (orgRes.ok) {
        const orgs = await orgRes.json()
        setOrganizations(orgs.filter((o: any) => ["owner", "trainer"].includes(o.userRole)))
        if (orgs.length > 0) {
          setNewProgramOrg(orgs.find((o: any) => ["owner", "trainer"].includes(o.userRole))?.id || "")
        }
      }

      // Fetch programs
      const programRes = await fetch("/api/programs")
      if (programRes.ok) {
        const data = await programRes.json()
        setPrograms(data)
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function createProgram(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProgramName,
        description: newProgramDesc,
        organizationId: newProgramOrg,
      }),
    })

    if (res.ok) {
      const program = await res.json()
      setPrograms([program, ...programs])
      setIsCreateOpen(false)
      setNewProgramName("")
      setNewProgramDesc("")
      toast({ title: "Program created" })
      router.push(`/trainer/programs/${program.id}`)
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
      <DashboardHeader heading="Programs" text="Create and manage workout programs">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>Create Program</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Program</DialogTitle>
            </DialogHeader>
            <form onSubmit={createProgram} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Program Name</Label>
                <Input
                  id="name"
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder="12-Week Strength Program"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newProgramDesc}
                  onChange={(e) => setNewProgramDesc(e.target.value)}
                  placeholder="A comprehensive strength building program..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org">Organization</Label>
                <Select value={newProgramOrg} onValueChange={setNewProgramOrg}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Create Program</Button>
            </form>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground mb-4">No programs yet</p>
            <Button onClick={() => setIsCreateOpen(true)}>Create Your First Program</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Card key={program.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{program.name}</CardTitle>
                <CardDescription>{program.organization.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {program.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {program.description}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Workouts</span>
                    <span>{program._count.workouts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clients</span>
                    <span>{program._count.assignments}</span>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  variant="secondary"
                  onClick={() => router.push(`/trainer/programs/${program.id}`)}
                >
                  Manage →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  )
}
