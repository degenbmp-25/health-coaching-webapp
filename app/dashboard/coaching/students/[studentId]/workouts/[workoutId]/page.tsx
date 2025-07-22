"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"

interface Exercise {
  exercise: {
    id: string
    name: string
    category: string
    muscleGroup: string
    description?: string | null
    equipment?: string | null
    imageUrl?: string | null
  }
  sets: number
  reps: number
  weight?: number | null
  notes?: string | null
  order: number
}

interface Workout {
  id: string
  name: string
  description?: string | null
  exercises: Exercise[]
  createdAt: string | Date
  updatedAt: string | Date
  userId: string
}

export default function StudentWorkoutDetailPage({
  params,
}: {
  params: { studentId: string; workoutId: string }
}) {
  const router = useRouter()
  const { user } = useUser()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [studentName, setStudentName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudentWorkout() {
      setIsLoading(true)
      setError(null)
      
      try {
        if (!user?.id) return
        
        // Fetch student details
        const studentResponse = await fetch(`/api/users/${params.studentId}`)
        if (!studentResponse.ok) {
          throw new Error("Failed to fetch student details")
        }
        const studentData = await studentResponse.json()
        setStudentName(studentData.name || "Student")
        
        // Fetch workout details using the API endpoint instead of the direct function
        const workoutResponse = await fetch(`/api/users/${params.studentId}/workouts/${params.workoutId}`)
        if (!workoutResponse.ok) {
          throw new Error("Failed to fetch workout details")
        }
        const workoutData = await workoutResponse.json()
        setWorkout(workoutData as Workout)
      } catch (error) {
        console.error("Error fetching student workout:", error)
        setError("Failed to load workout details. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudentWorkout()
  }, [params.studentId, params.workoutId, user?.id])

  const handleEditWorkout = () => {
    // In a future enhancement, navigate to edit page
    router.push(`/dashboard/coaching/students/${params.studentId}/workouts/${params.workoutId}/edit`)
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
        heading={isLoading ? "Loading Workout..." : workout?.name || "Workout Details"}
        text={`View workout details for ${studentName}`}
      >
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Button onClick={handleEditWorkout}>
            <Icons.edit className="mr-2 h-4 w-4" />
            Edit Workout
          </Button>
        </div>
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
                <h3 className="font-medium text-lg mb-1">Failed to load workout</h3>
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
        ) : !workout ? (
          <Card>
            <CardContent className="p-10">
              <div className="flex flex-col items-center justify-center text-center">
                <Icons.dumbbell className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-1">Workout Not Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  The requested workout could not be found.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/dashboard/coaching/students/${params.studentId}/workouts`)}
                >
                  Back to Workouts
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{workout.name}</CardTitle>
                {workout.description && (
                  <CardDescription>
                    {workout.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-muted-foreground mb-4">
                  <div>
                    <span className="font-medium">Created:</span> {format(new Date(workout.createdAt), 'MMMM d, yyyy')}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> {format(new Date(workout.updatedAt), 'MMMM d, yyyy')}
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <h3 className="text-lg font-medium mb-4">Exercise Plan</h3>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exercise</TableHead>
                      <TableHead>Sets</TableHead>
                      <TableHead>Reps</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workout.exercises.sort((a, b) => a.order - b.order).map((exercise) => (
                      <TableRow key={`${exercise.exercise.id}-${exercise.order}`}>
                        <TableCell className="font-medium">
                          <div>
                            {exercise.exercise.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {exercise.exercise.muscleGroup} · {exercise.exercise.category}
                          </div>
                        </TableCell>
                        <TableCell>{exercise.sets}</TableCell>
                        <TableCell>{exercise.reps}</TableCell>
                        <TableCell>{exercise.weight ? `${exercise.weight} kg` : '-'}</TableCell>
                        <TableCell className="max-w-xs">{exercise.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            {workout.exercises.some(ex => ex.exercise.description) && (
              <Card>
                <CardHeader>
                  <CardTitle>Exercise Descriptions</CardTitle>
                  <CardDescription>
                    Details about each exercise in this workout
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {workout.exercises
                    .filter(ex => ex.exercise.description)
                    .sort((a, b) => a.order - b.order)
                    .map((exercise) => (
                      <div key={`desc-${exercise.exercise.id}-${exercise.order}`} className="space-y-2">
                        <h4 className="font-medium">{exercise.exercise.name}</h4>
                        <p className="text-sm">{exercise.exercise.description}</p>
                        {exercise.exercise.equipment && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Equipment:</span> {exercise.exercise.equipment}
                          </p>
                        )}
                        <Separator className="my-2" />
                      </div>
                    ))
                  }
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Shell>
  )
} 