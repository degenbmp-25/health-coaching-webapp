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

interface CoachSelectorProps {
  userId: string
  onCoachSelected: () => void
}

interface Coach {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export function CoachSelector({ userId, onCoachSelected }: CoachSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchCoaches = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/users/search?role=coach&query=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) {
        throw new Error("Failed to search for coaches")
      }
      
      const data = await response.json()
      setCoaches(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const selectCoach = async (coachId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}/coach`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coachId }),
      })

      if (!response.ok) {
        throw new Error("Failed to select coach")
      }

      onCoachSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find a Coach</CardTitle>
        <CardDescription>Search for a coach to help with your fitness journey</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2 mb-4">
          <Input
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchCoaches()}
          />
          <Button onClick={searchCoaches} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
        
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="space-y-4">
          {coaches.map((coach) => (
            <div key={coach.id} className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={coach.image || ""} alt={coach.name || "Coach"} />
                  <AvatarFallback>{coach.name?.charAt(0) || "C"}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{coach.name}</h3>
                  <p className="text-sm text-muted-foreground">{coach.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => selectCoach(coach.id)}
                disabled={loading}
              >
                Select as Coach
              </Button>
            </div>
          ))}
          
          {coaches.length === 0 && searchQuery && !loading && (
            <p className="text-center text-muted-foreground py-4">No coaches found. Try a different search.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 