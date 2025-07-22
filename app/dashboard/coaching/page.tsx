"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { UserCoach } from "@/components/coach/UserCoach"
import { CoachStudents } from "@/components/coach/CoachStudents"
import { CoachSelector } from "@/components/coach/CoachSelector"
import { StudentDataDashboard } from "@/components/coach/StudentDataDashboard"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardHeader, 
  CardDescription, 
  CardContent, 
  CardFooter, 
  CardTitle 
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Student {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export default function CoachingPage() {
  const { user } = useUser()
  const [showCoachSearch, setShowCoachSearch] = useState(false)
  const [isBecomingCoach, setIsBecomingCoach] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("student")
  const [hasCoach, setHasCoach] = useState<boolean>(false)
  const [students, setStudents] = useState<Student[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  
  useEffect(() => {
    if (user?.publicMetadata?.role === "coach") {
      setActiveTab("coach")
      fetchStudents()
    } else {
      setActiveTab("student")
    }
  }, [user?.publicMetadata?.role])
  
  const fetchStudents = async () => {
    if (!user?.id) return
    
    setIsLoadingStudents(true)
    try {
      const response = await fetch(`/api/users/${user.id}/students`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  const userId = user.id
  const userRole = user.publicMetadata?.role || "user"

  const handleCoachSelected = () => {
    setShowCoachSearch(false)
    setHasCoach(true)
  }

  const becomeCoach = async () => {
    try {
      setIsBecomingCoach(true)
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

      // Update the session instead of reloading the page
      // await update({ role: "coach" }) // This line was removed as per the edit hint
      setIsBecomingCoach(false)
    } catch (error) {
      console.error("Error becoming a coach:", error)
      setIsBecomingCoach(false)
    }
  }

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Coaching</h1>
          <p className="text-muted-foreground mt-1">Connect with coaches or become a coach yourself</p>
        </div>
        
        {userRole === "coach" ? (
          <Badge variant="default" className="text-md px-3 py-1">Coach</Badge>
        ) : userRole === "user" ? (
          <Button onClick={becomeCoach} disabled={isBecomingCoach}>
            {isBecomingCoach ? "Processing..." : "Become a Coach"}
          </Button>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="student">As Student</TabsTrigger>
          <TabsTrigger value="coach">As Coach</TabsTrigger>
        </TabsList>
        
        <TabsContent value="student" className="space-y-4">
          <UserCoach userId={userId} onHasCoach={setHasCoach} />
          
          {!showCoachSearch && !hasCoach && (
            <div className="flex justify-center mt-4">
              <Button onClick={() => setShowCoachSearch(true)}>
                Find a Coach
              </Button>
            </div>
          )}
          
          {showCoachSearch && (
            <CoachSelector 
              userId={userId}
              onCoachSelected={handleCoachSelected}
            />
          )}
        </TabsContent>
        
        <TabsContent value="coach" className="space-y-4">
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
                  Becoming a coach allows you to take on students who will be able to share their fitness
                  journey with you.
                </p>
              </CardContent>
              <CardFooter>
                <Button onClick={becomeCoach} disabled={isBecomingCoach}>
                  {isBecomingCoach ? "Processing..." : "Become a Coach"}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Student Data Dashboard */}
              <StudentDataDashboard 
                coach={user}
                students={students}
              />
              
              {/* Legacy Students List (can be removed if needed) */}
              <Card className="hidden">
                <CardHeader>
                  <CardTitle>Your Students</CardTitle>
                  <CardDescription>
                    Manage your students
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CoachStudents userId={userId} />
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 