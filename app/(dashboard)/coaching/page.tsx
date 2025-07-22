"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserCoach } from "@/components/coach/UserCoach"
import { CoachStudents } from "@/components/coach/CoachStudents"
import { CoachSelector } from "@/components/coach/CoachSelector"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardHeader, 
  CardDescription, 
  CardContent, 
  CardFooter, 
  CardTitle 
} from "@/components/ui/card"

export default function CoachingPage() {
  const { user } = useUser()
  const [showCoachSearch, setShowCoachSearch] = useState(false)
  
  if (!user) {
    return <div>Loading...</div>
  }

  const userId = user.id
  const userRole = user.publicMetadata?.role || "user"

  const handleCoachSelected = () => {
    setShowCoachSearch(false)
  }

  const becomeCoach = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "coach" }),
      })

      if (!response.ok) {
        throw new Error("Failed to become a coach")
      }

      // Refresh the session to get the updated role
      window.location.reload()
    } catch (error) {
      console.error("Error becoming a coach:", error)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Coaching</h1>

      <Tabs defaultValue={userRole === "coach" ? "as-coach" : "as-student"}>
        <TabsList className="mb-6">
          <TabsTrigger value="as-student">As Student</TabsTrigger>
          <TabsTrigger value="as-coach">As Coach</TabsTrigger>
        </TabsList>
        
        <TabsContent value="as-student">
          <div className="space-y-6">
            <UserCoach userId={userId} />
            
            {!showCoachSearch && (
              <div className="flex justify-center mt-4">
                <Button onClick={() => setShowCoachSearch(true)}>
                  Find a New Coach
                </Button>
              </div>
            )}
            
            {showCoachSearch && (
              <CoachSelector 
                userId={userId}
                onCoachSelected={handleCoachSelected}
              />
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="as-coach">
          {userRole !== "coach" ? (
            <Card>
              <CardHeader>
                <CardTitle>Become a Coach</CardTitle>
                <CardDescription>
                  Help others reach their fitness goals by becoming a coach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>
                  As a coach, you can guide other users, view their progress, and provide personalized advice.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={becomeCoach}>
                  Become a Coach
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-6">
              <CoachStudents userId={userId} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 