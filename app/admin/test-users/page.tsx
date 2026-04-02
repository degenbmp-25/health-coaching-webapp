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

export default function AdminTestUsersPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"client" | "trainer">("client")
  const [programId, setProgramId] = useState("")
  
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
      setLoading(false)
    }
    load()
  }, [router])

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setIsCreating(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/admin/test-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, programId }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || "Failed to create user")
      } else {
        setResult(data)
        setEmail("")
        setPassword("")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <DashboardHeader
        title="Test User Management"
        description="Create test users for the Habithletics app"
      />
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Test User</CardTitle>
            <CardDescription>
              Creates a user in Clerk with password auth and adds them to the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v: "client" | "trainer") => setRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="trainer">Trainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="programId">Program ID (optional)</Label>
                <Input
                  id="programId"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  placeholder="cmnc69ttq000516mxjxfspj61"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to skip program assignment
                </p>
              </div>
              
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create User"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {error && (
          <Card className="border-red-500">
            <CardContent className="pt-6">
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        )}
        
        {result && (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle>User Created Successfully!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Email:</strong> {result.user?.email}</p>
              <p><strong>Clerk ID:</strong> {result.user?.clerkId}</p>
              <p><strong>Database ID:</strong> {result.user?.id}</p>
              <p><strong>Role:</strong> {result.organizationMembership?.role}</p>
              <p><strong>Organization:</strong> {result.organizationMembership?.organization?.name}</p>
              {result.programAssignment && (
                <p><strong>Program:</strong> {result.programAssignment.program?.name}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  )
}
