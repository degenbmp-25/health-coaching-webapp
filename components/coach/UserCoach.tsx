"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Icons } from "@/components/icons"

interface UserCoachProps {
  userId: string
  onHasCoach?: (hasCoach: boolean) => void
}

export function UserCoach({ userId, onHasCoach }: UserCoachProps) {
  const router = useRouter()
  const { user } = useUser()
  const [coach, setCoach] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCoach() {
      try {
        setLoading(true)
        const response = await fetch(`/api/users/${userId}/coach`)
        
        if (response.status === 404) {
          setCoach(null)
          onHasCoach?.(false)
          return
        }
        
        if (!response.ok) {
          throw new Error("Failed to fetch coach")
        }
        
        const data = await response.json()
        setCoach(data)
        onHasCoach?.(!!data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
        onHasCoach?.(false)
      } finally {
        setLoading(false)
      }
    }

    fetchCoach()
  }, [userId, onHasCoach])

  const removeCoach = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/${userId}/coach`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coachId: null }),
      })

      if (!response.ok) {
        throw new Error("Failed to remove coach")
      }

      setCoach(null)
      onHasCoach?.(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  // Message the coach directly
  const messageCoach = async () => {
    if (coach) {
      await startConversation(coach.id)
    }
  }
  
  // Start or open existing conversation
  const startConversation = async (coachId: string) => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: coachId,
        }),
      })

      if (!response.ok) throw new Error("Failed to create conversation")
      
      const conversation = await response.json()
      router.push(`/dashboard/messages?conversation=${conversation.id}`)
    } catch (error) {
      console.error("Error starting conversation:", error)
    }
  }

  if (loading) {
    return <div>Loading coach information...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!coach) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Coach</CardTitle>
          <CardDescription>You don&apos;t have a coach yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Connect with a coach to get personalized guidance on your fitness journey.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Coach</CardTitle>
        <CardDescription>Your personal fitness mentor</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center space-x-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={coach.image || ""} alt={coach.name || "Coach"} />
          <AvatarFallback>{coach.name?.charAt(0) || "C"}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{coach.name}</h3>
          <p className="text-sm text-muted-foreground">{coach.email}</p>
        </div>
      </CardContent>
      {userId === user?.id && (
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={messageCoach}
            className="flex items-center gap-1"
          >
            <Icons.message className="h-4 w-4 mr-1" />
            <span>Message Coach</span>
          </Button>
          <Button variant="destructive" onClick={removeCoach}>
            Remove Coach
          </Button>
        </CardFooter>
      )}
    </Card>
  )
} 