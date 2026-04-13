"use client"

import { MouseEvent, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

interface Client {
  id: string
  name: string | null
  email: string
  image: string | null
  organizationRole: string | null
  organizationName?: string
  programAssignments: Array<{
    id: string
    program: {
      id: string
      name: string
    }
  }>
}

interface OrganizationOption {
  id: string
  name: string
  userRole: string
  trainers: Array<{
    id: string
    name: string | null
    email: string
    role: string
  }>
}

export default function TrainerClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [clientEmail, setClientEmail] = useState("")
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [selectedTrainerId, setSelectedTrainerId] = useState("")
  const [addingClient, setAddingClient] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const load = useCallback(async () => {
    const userRes = await fetch("/api/users/me")
    if (!userRes.ok) {
      router.push("/signin")
      return
    }

    const orgRes = await fetch("/api/organizations")
    if (orgRes.ok) {
      const orgs = await orgRes.json()
      const allClients: Client[] = []
      const manageableOrgs: OrganizationOption[] = []

      for (const org of orgs) {
        if (["owner", "trainer", "coach"].includes(org.userRole)) {
          const detailRes = await fetch(`/api/organizations/${org.id}`)
          if (detailRes.ok) {
            const detail = await detailRes.json()
            const orgClients = detail.members
              .filter((m: any) => m.role === "client")
              .map((m: any) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
                organizationRole: m.user.organizationRole,
                organizationName: org.name,
                programAssignments: m.programAssignments || [],
              } as Client))
            allClients.push(...orgClients)

            manageableOrgs.push({
              id: org.id,
              name: org.name,
              userRole: org.userRole,
              trainers: detail.members
                .filter((m: any) => ["owner", "trainer"].includes(m.role))
                .map((m: any) => ({
                  id: m.user.id,
                  name: m.user.name,
                  email: m.user.email,
                  role: m.role,
                })),
            })
          }
        }
      }

      setClients(allClients)
      setOrganizations(manageableOrgs)
      setSelectedOrgId((currentOrgId) => {
        if (currentOrgId || manageableOrgs.length === 0) return currentOrgId
        setSelectedTrainerId(manageableOrgs[0].trainers[0]?.id || "")
        return manageableOrgs[0].id
      })
    }
    setLoading(false)
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  async function addClient(event: React.FormEvent) {
    event.preventDefault()
    if (!selectedOrgId || !clientEmail.trim()) return

    setAddingClient(true)
    const res = await fetch(`/api/organizations/${selectedOrgId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: clientEmail.trim(),
        role: "client",
        primaryTrainerId: selectedTrainerId || undefined,
      }),
    })

    if (res.ok) {
      toast({ title: "Client added" })
      setClientEmail("")
      setIsAddOpen(false)
      await load()
    } else {
      const error = await res.json().catch(() => null)
      toast({
        title: error?.error || "Failed to add client",
        variant: "destructive",
      })
    }
    setAddingClient(false)
  }

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId)

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">Loading...</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <DashboardHeader heading="My Clients" text="Manage your client roster">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>Add Client</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Client</DialogTitle>
              <DialogDescription>
                Add a signed-up user to your organization so they can receive programs.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={addClient} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-email">Client email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(event) => setClientEmail(event.target.value)}
                  placeholder="client@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={selectedOrgId}
                  onValueChange={(value) => {
                    const nextOrg = organizations.find((org) => org.id === value)
                    setSelectedOrgId(value)
                    setSelectedTrainerId(nextOrg?.trainers[0]?.id || "")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose organization" />
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

              <div className="space-y-2">
                <Label>Primary trainer</Label>
                <Select value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedOrg?.trainers.map((trainer) => (
                      <SelectItem key={trainer.id} value={trainer.id}>
                        {trainer.name || trainer.email} ({trainer.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={addingClient || !selectedOrgId}>
                {addingClient ? "Adding..." : "Add Client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </DashboardHeader>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground mb-4">No clients yet</p>
            <Button onClick={() => setIsAddOpen(true)}>Add Client</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Client Roster</CardTitle>
            <CardDescription>{clients.length} clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex min-w-0 flex-col gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => router.push(`/trainer/clients/${client.id}`)}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-muted flex items-center justify-center">
                      {client.image ? (
                        <img src={client.image} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-lg">{client.name?.[0] || client.email[0]}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="break-words font-medium">{client.name || "Unknown"}</p>
                      <p className="break-all text-sm text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="break-words text-sm text-muted-foreground">{client.organizationName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation()
                        router.push(`/trainer/clients/${client.id}`)
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </Shell>
  )
}
