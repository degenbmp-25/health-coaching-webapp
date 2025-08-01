"use client"

import { Metadata } from "next"
import { redirect } from "next/navigation"
import { useRouter } from "next/navigation"
import * as React from "react"

import { getCurrentUser } from "@/lib/session"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import Image from "next/image"

interface User {
  id: string
  name: string | null
  image: string | null
}

export default function NewMessagePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [users, setUsers] = React.useState<User[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([])
      return
    }

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error("Failed to search users")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      })
    }
  }

  const startConversation = async (userId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: userId,
        }),
      })

      if (!response.ok) throw new Error("Failed to create conversation")
      
      const conversation = await response.json()
      router.push(`/dashboard/messages?conversation=${conversation.id}`)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Debounce search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  return (
    <Shell>
      <DashboardHeader 
        heading="New Message" 
        text="Start a new conversation."
      />
      <div className="max-w-2xl mx-auto">
        <Card className="p-4">
          <div className="space-y-4">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {user.image ? (
                      <div className="w-10 h-10 rounded-full relative overflow-hidden">
                        <Image
                          src={user.image}
                          alt={user.name || "User"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Icons.user className="h-6 w-6" />
                      </div>
                    )}
                    <div className="font-medium">{user.name || "User"}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startConversation(user.id)}
                    disabled={isLoading}
                  >
                    Message
                  </Button>
                </div>
              ))}
              {searchQuery && users.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No users found
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </Shell>
  )
} 