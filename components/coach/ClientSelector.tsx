"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface ClientSelectorProps {
  coachId: string // Clerk ID of the coach
  onClientAdded: () => void
}

interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export function ClientSelector({ coachId, onClientAdded }: ClientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const searchUsers = async () => {
    if (!searchQuery.trim()) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) {
        throw new Error("Failed to search for users")
      }
      
      const data = await response.json()
      // Filter out users who are already coaches or don't have email
      const potentialClients = data.filter((user: User) => 
        user.email && !user.email.includes("coach")
      )
      setUsers(potentialClients)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const addAsClient = async (userId: string) => {
    try {
      setAddingId(userId)
      setError(null)
      
      // Call the coach endpoint - this sets the user's coachId to this coach
      const response = await fetch(`/api/users/${userId}/coach`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coachId }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || "Failed to add client")
      }

      toast({
        title: "Success!",
        description: "Client added successfully.",
      })
      
      onClientAdded()
      // Clear search after adding
      setSearchQuery("")
      setUsers([])
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      })
    } finally {
      setAddingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Clients</CardTitle>
        <CardDescription>Search for users to add as your clients</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
          />
          <Button onClick={searchUsers} disabled={loading || !searchQuery.trim()}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
        
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                  <AvatarFallback>{user.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{user.name || "Unnamed User"}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button
                variant="default"
                onClick={() => addAsClient(user.id)}
                disabled={addingId === user.id}
              >
                {addingId === user.id ? "Adding..." : "Add as Client"}
              </Button>
            </div>
          ))}
          
          {users.length === 0 && searchQuery && !loading && (
            <p className="text-center text-muted-foreground py-4">No users found. Try a different search.</p>
          )}
          
          {!searchQuery && (
            <p className="text-center text-muted-foreground py-4">Enter a name or email to search for users.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}