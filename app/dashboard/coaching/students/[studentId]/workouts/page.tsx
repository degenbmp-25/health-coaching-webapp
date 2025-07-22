"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Icons } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

interface Workout {
  id: string
  name: string
  description?: string
  updatedAt: string
  exerciseCount: number
}

export default function StudentWorkoutsPage({
}: {}) {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [studentName, setStudentName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudentWorkouts() {
      setIsLoading(true)
      setError(null)
      
      try {
        if (!user?.id) return
        
        // Fetch student details
        const studentResponse = await fetch(`/api/users/${params.studentId}`)
        if (!studentResponse.ok) {
          console.error(`Failed to fetch student details: ${studentResponse.status} ${studentResponse.statusText}`)
          throw new Error(`Failed to fetch student details: ${studentResponse.status}`)
        }
        const studentData = await studentResponse.json()
        setStudentName(studentData.name || "Student")
        
        // Fetch student workouts using the API endpoint
        console.log(`Fetching workouts for student ${params.studentId}`)
        const workoutsResponse = await fetch(`/api/users/${params.studentId}/workouts`)
        
        if (!workoutsResponse.ok) {
          // Log the full error response
          const errorText = await workoutsResponse.text().catch(() => "Could not read error response");
          console.error(`Failed to fetch workouts: ${workoutsResponse.status} ${workoutsResponse.statusText}`);
          console.error(`Error response: ${errorText}`);
          throw new Error(`Failed to fetch student workouts: ${workoutsResponse.status}`)
        }
        
        const workoutsData = await workoutsResponse.json()
        console.log('Workouts data received:', workoutsData);
        
        // Transform workout data to match our interface
        const formattedWorkouts: Workout[] = workoutsData.map((workout: any) => ({
          id: workout.id,
          name: workout.name,
          description: workout.description,
          updatedAt: workout.updatedAt,
          exerciseCount: workout.exercises?.length || 0
        }))
        setWorkouts(formattedWorkouts)
      } catch (error) {
        console.error("Error fetching student workouts:", error)
        setError(`Failed to load workouts. ${error instanceof Error ? error.message : 'Please try again.'}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudentWorkouts()
  }, [params.studentId, user?.id])

  const handleCreateWorkout = () => {
    router.push(`/dashboard/coaching/students/${params.studentId}/workouts/new`)
  }

  const handleViewWorkout = (workoutId: string) => {
    router.push(`/dashboard/coaching/students/${params.studentId}/workouts/${workoutId}`)
  }

  if (!user?.id) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <DashboardHeader
        heading={`${studentName}'s Workouts`}
        text="View and manage workouts for your student"
      >
        <Button onClick={handleCreateWorkout}>
          <Icons.add className="mr-2 h-4 w-4" />
          Create Workout
        </Button>
      </DashboardHeader>

      <div className="grid gap-6">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-10">
              <div className="flex flex-col items-center justify-center text-center">
                <Icons.warning className="h-8 w-8 text-amber-500 mb-4" />
                <h3 className="font-medium text-lg mb-1">Failed to load workouts</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button 
                  variant="outline" 
                  onClick={() => router.refresh()}
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : workouts.length === 0 ? (
          <Card>
            <CardContent className="p-10">
              <div className="flex flex-col items-center justify-center text-center">
                <Icons.dumbbell className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-1">No Workouts Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first workout plan for {studentName}.
                </p>
                <Button onClick={handleCreateWorkout}>
                  <Icons.add className="mr-2 h-4 w-4" />
                  Create Workout
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Workout Plans</CardTitle>
              <CardDescription>
                All workout plans created for {studentName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>A list of all workout plans.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Exercises</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workouts.map((workout) => (
                    <TableRow key={workout.id}>
                      <TableCell className="font-medium">{workout.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{workout.exerciseCount} exercises</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(workout.updatedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewWorkout(workout.id)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Shell>
  )
} 