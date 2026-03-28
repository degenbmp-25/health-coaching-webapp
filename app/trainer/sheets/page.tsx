"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface SheetConnection {
  id: string
  sheetUrl: string
  sheetId: string
  organization: { id: string; name: string }
  createdAt: string
}

export default function TrainerSheetsPage() {
  const [user, setUser] = useState<any>(null)
  const [connections, setConnections] = useState<SheetConnection[]>([])
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [sheetUrl, setSheetUrl] = useState("")
  const [selectedOrg, setSelectedOrg] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/signin")
        return
      }
      setUser(currentUser)

      // Fetch organizations
      const orgRes = await fetch("/api/organizations")
      if (orgRes.ok) {
        const orgs = await orgRes.json()
        const trainerOrgs = orgs.filter((o: any) => ["owner", "trainer"].includes(o.userRole))
        setOrganizations(trainerOrgs)
        if (trainerOrgs.length > 0) {
          setSelectedOrg(trainerOrgs[0].id)
        }
      }

      // Fetch existing connections
      const sheetRes = await fetch("/api/sheets/connect")
      if (sheetRes.ok) {
        const data = await sheetRes.json()
        setConnections(data)
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function connectSheet(e: React.FormEvent) {
    e.preventDefault()
    if (!sheetUrl) return

    setConnecting(true)
    const res = await fetch("/api/sheets/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: selectedOrg,
        sheetUrl,
      }),
    })

    if (res.ok) {
      const connection = await res.json()
      const org = organizations.find((o) => o.id === selectedOrg)
      setConnections([
        ...connections.filter((c) => c.organization.id !== selectedOrg),
        { ...connection, organization: org },
      ])
      setSheetUrl("")
      toast({ title: "Google Sheet connected" })
    } else {
      const error = await res.json()
      toast({ title: error.error || "Failed to connect sheet", variant: "destructive" })
    }
    setConnecting(false)
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
      <DashboardHeader heading="Google Sheets" text="Connect your sheets to sync workout data" />

      <Card>
        <CardHeader>
          <CardTitle>Connect a Google Sheet</CardTitle>
          <CardDescription>
            Link a Google Sheet to automatically sync your clients' workout completions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={connectSheet} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org">Organization</Label>
              <select
                id="org"
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full h-10 px-3 border rounded-md bg-background"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sheetUrl">Google Sheet URL</Label>
              <Input
                id="sheetUrl"
                type="url"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                required
              />
            </div>
            <Button type="submit" disabled={connecting}>
              {connecting ? "Connecting..." : "Connect Sheet"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {connections.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Connected Sheets</CardTitle>
            <CardDescription>Your active Google Sheet connections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{conn.organization.name}</p>
                    <a
                      href={conn.sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline"
                    >
                      {conn.sheetUrl}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      Connected {new Date(conn.createdAt).toLocaleDateString()}
                    </p>
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
