"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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

export default function TrainerClientsPage() {
  const [user, setUser] = useState<any>(null)
  const [clients, setClients] = useState<Client[]>([])
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

      // Fetch organizations to get clients
      const orgRes = await fetch("/api/organizations")
      if (orgRes.ok) {
        const orgs = await orgRes.json()
        // Get clients from all organizations where user is a trainer/owner
        const allClients: Client[] = []
        
        for (const org of orgs) {
          if (["owner", "trainer"].includes(org.userRole)) {
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
            }
          }
        }
        
        setClients(allClients)
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
      <DashboardHeader heading="My Clients" text="Manage your client roster" />

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48">
            <p className="text-muted-foreground mb-4">No clients yet</p>
            <p className="text-sm text-muted-foreground">Add clients through your organization</p>
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/trainer/clients/${client.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {client.image ? (
                        <img src={client.image} className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-lg">{client.name?.[0] || client.email[0]}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{client.name || "Unknown"}</p>
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{client.organizationName}</Badge>
                    <Button variant="ghost" size="sm">
                      View →
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
