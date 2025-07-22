"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardDescription, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Icons } from "@/components/icons"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CreateStudentActivityDialog } from "./CreateStudentActivityDialog"
import { StudentActivityDeleteButton } from "./StudentActivityDeleteButton"
import { DashboardGoals } from "@/components/pages/dashboard/dashboard-goals"
import { StreakOverview } from "@/components/pages/dashboard/streak-overview"
import { SendEmailDialog } from "./SendEmailDialog"

interface Student {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

interface Meal {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  date: string | Date
}

interface Activity {
  id: string
  name: string
  description?: string | null
  colorCode: string
  createdAt: string | Date
  updatedAt: string | Date
}

interface Exercise {
  exercise: {
    id: string
    name: string
    description?: string
    category: string
    muscleGroup: string
  }
  sets: number
  reps: number
  weight?: number
  notes?: string
}

interface Workout {
  id: string
  name: string
  description?: string | null
  exercises: Exercise[]
  createdAt: string | Date
  updatedAt: string | Date
}

interface StudentDataDashboardProps {
  coach: any // Changed from User to any as User is no longer imported
  student?: Student
  students: Student[]
}

export function StudentDataDashboard({ 
  coach, 
  student: initialStudent, 
  students 
}: StudentDataDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(initialStudent)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  
  const [studentMeals, setStudentMeals] = useState<Meal[]>([])
  const [studentWorkouts, setStudentWorkouts] = useState<Workout[]>([])
  const [studentActivities, setStudentActivities] = useState<Activity[]>([])
  const [studentLogs, setStudentLogs] = useState<any[]>([])
  const [studentStreak, setStudentStreak] = useState<{currentStreak: number, longestStreak: number}>({currentStreak: 0, longestStreak: 0})
  const [isCreateActivityDialogOpen, setIsCreateActivityDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Fetch student data when student or date changes
  useEffect(() => {
    async function fetchStudentData() {
      if (!selectedStudent) return
      
      setIsLoading(true)
      try {
        // Fetch meals
        const dateParam = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
        const mealsResponse = await fetch(
          `/api/users/${selectedStudent.id}/meals${dateParam ? `?date=${dateParam}` : ''}`
        )
        
        if (mealsResponse.ok) {
          const mealsData = await mealsResponse.json()
          setStudentMeals(mealsData)
        }
        
        // Fetch workouts
        const workoutsResponse = await fetch(`/api/users/${selectedStudent.id}/workouts`)
        
        if (workoutsResponse.ok) {
          const workoutsData = await workoutsResponse.json()
          setStudentWorkouts(workoutsData)
        }

        // Fetch activities
        const activitiesResponse = await fetch(`/api/users/${selectedStudent.id}/activities`)
        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json()
          setStudentActivities(activitiesData)
        }

        // Fetch dashboard data (logs and streak)
        const dashboardResponse = await fetch(`/api/users/${selectedStudent.id}/dashboard`)
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json()
          setStudentLogs(dashboardData.logs || [])
          setStudentStreak(dashboardData.streak || {currentStreak: 0, longestStreak: 0})
        }

      } catch (error) {
        console.error("Error fetching student data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchStudentData()
  }, [selectedStudent, selectedDate])
  
  // Handle student change
  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId)
    setSelectedStudent(student)
  }
  
  // Create new workout for student
  const createWorkoutForStudent = () => {
    if (selectedStudent) {
      router.push(`/dashboard/coaching/students/${selectedStudent.id}/workouts/new`)
    }
  }
  
  // Message the student directly
  const messageStudent = () => {
    if (selectedStudent) {
      startConversation(selectedStudent.id)
    }
  }
  
  // Start or open existing conversation
  const startConversation = async (studentId: string) => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId: studentId,
        }),
      })

      if (!response.ok) throw new Error("Failed to create conversation")
      
      const conversation = await response.json()
      router.push(`/dashboard/messages?conversation=${conversation.id}`)
    } catch (error) {
      console.error("Error starting conversation:", error)
    }
  }
  
  // Function to open the create activity dialog
  const openCreateActivityDialog = () => {
    setIsCreateActivityDialogOpen(true)
  }

  // Function to refresh activities after creation
  const handleActivityCreated = async () => {
    if (!selectedStudent) return
    setIsCreateActivityDialogOpen(false) // Close dialog
    // Refetch activities
    try {
      const activitiesResponse = await fetch(`/api/users/${selectedStudent.id}/activities`)
      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json()
        setStudentActivities(activitiesData)
      }
    } catch (error) {
      console.error("Error refetching activities:", error)
      // Optionally show an error message to the user
    }
  }
  
  if (!selectedStudent && students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Dashboard</CardTitle>
          <CardDescription>You don&apos;t have any students yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p>When users select you as their coach, you&apos;ll be able to view and manage their fitness data here.</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Dashboard</CardTitle>
          <CardDescription>View and manage your students&apos; fitness data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4 md:items-center">
            <div className="flex-1">
              <Select onValueChange={handleStudentChange} defaultValue={selectedStudent?.id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name || student.email || "Unnamed Student"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedStudent && (
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedStudent.image || ""} alt={selectedStudent.name || "Student"} />
                  <AvatarFallback>{selectedStudent.name?.charAt(0) || "S"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedStudent.name || "Unnamed Student"}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={messageStudent}
                    className="flex items-center gap-1"
                  >
                    <Icons.message className="h-4 w-4 mr-1" />
                    <span>Message</span>
                  </Button>
                  <SendEmailDialog
                    studentId={selectedStudent.id}
                    studentName={selectedStudent.name || selectedStudent.email || "Student"}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Icons.send className="h-4 w-4 mr-1" />
                      <span>Email</span>
                    </Button>
                  </SendEmailDialog>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle>Student Summary</CardTitle>
            <CardDescription>Quick overview of {selectedStudent.name}&apos;s progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{studentStreak.currentStreak}</div>
                <div className="text-sm text-muted-foreground">Current Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{studentStreak.longestStreak}</div>
                <div className="text-sm text-muted-foreground">Best Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{studentWorkouts.length}</div>
                <div className="text-sm text-muted-foreground">Total Workouts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{studentActivities.length}</div>
                <div className="text-sm text-muted-foreground">Activities</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedStudent && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="meals">Meals</TabsTrigger>
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            {/* Student Streak Overview */}
            <StreakOverview logs={studentLogs} streak={studentStreak} />
            
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
                <CardDescription>Summary of {selectedStudent.name}&apos;s fitness data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Recent Meals</h3>
                    {isLoading ? (
                      <div>Loading meals...</div>
                    ) : studentMeals.length > 0 ? (
                      <div className="space-y-3">
                        {studentMeals.slice(0, 3).map((meal) => (
                          <div key={meal.id} className="flex justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                              {meal.imageUrl && (
                                <div className="h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
                                  <img 
                                    src={meal.imageUrl} 
                                    alt={meal.name} 
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{meal.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {meal.calories} calories
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(meal.date), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ))}
                        <Link href={`/dashboard/coaching/students/${selectedStudent.id}/meals`} className="text-sm text-primary hover:underline">
                          View all meals
                        </Link>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No meals recorded</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Recent Workouts</h3>
                    {isLoading ? (
                      <div>Loading workouts...</div>
                    ) : studentWorkouts.length > 0 ? (
                      <div className="space-y-3">
                        {studentWorkouts.slice(0, 3).map((workout) => (
                          <div key={workout.id} className="flex justify-between border-b pb-2">
                            <div>
                              <p className="font-medium">{workout.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {workout.exercises.length} exercises
                              </p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(workout.updatedAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ))}
                        <Link href={`/dashboard/coaching/students/${selectedStudent.id}/workouts`} className="text-sm text-primary hover:underline">
                          View all workouts
                        </Link>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No workouts recorded</p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button 
                  variant="outline"
                  onClick={createWorkoutForStudent}
                >
                  Create Workout for {selectedStudent.name}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="streaks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Streak Details</CardTitle>
                <CardDescription>Detailed view of {selectedStudent.name}&apos;s activity streaks</CardDescription>
              </CardHeader>
              <CardContent>
                <StreakOverview logs={studentLogs} streak={studentStreak} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <DashboardGoals 
              userId={selectedStudent.id} 
              isCoach={true} 
              studentName={selectedStudent.name || "Student"} 
            />
          </TabsContent>
          
          <TabsContent value="meals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Meals</CardTitle>
                <CardDescription>{selectedStudent.name}&apos;s meal history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Select Date</h3>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="border rounded-md p-2"
                    />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      Meals for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'All dates'}
                    </h3>
                    {isLoading ? (
                      <div>Loading meals...</div>
                    ) : studentMeals.length > 0 ? (
                      <div className="space-y-4">
                        {studentMeals.map((meal) => (
                          <div key={meal.id} className="border rounded-md p-3">
                            <div className="flex justify-between">
                              <h4 className="font-medium">{meal.name}</h4>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(meal.date), 'h:mm a')}
                              </span>
                            </div>
                            {meal.description && (
                              <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
                            )}
                            {meal.imageUrl && (
                              <div className="mt-2 rounded-md overflow-hidden h-32 w-full">
                                <img 
                                  src={meal.imageUrl} 
                                  alt={meal.name}
                                  className="h-full w-full object-cover" 
                                />
                              </div>
                            )}
                            <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                              <div>
                                <p className="font-medium">{meal.calories}</p>
                                <p className="text-xs text-muted-foreground">Calories</p>
                              </div>
                              <div>
                                <p className="font-medium">{meal.protein}g</p>
                                <p className="text-xs text-muted-foreground">Protein</p>
                              </div>
                              <div>
                                <p className="font-medium">{meal.carbs}g</p>
                                <p className="text-xs text-muted-foreground">Carbs</p>
                              </div>
                              <div>
                                <p className="font-medium">{meal.fat}g</p>
                                <p className="text-xs text-muted-foreground">Fat</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-40 border rounded-md">
                        <p className="text-muted-foreground">No meals recorded for this date</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="workouts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Workouts</CardTitle>
                  <CardDescription>{selectedStudent.name}&apos;s workout plans</CardDescription>
                </div>
                <Button onClick={createWorkoutForStudent}>
                  Create Workout
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading workouts...</div>
                ) : studentWorkouts.length > 0 ? (
                  <div className="space-y-4">
                    {studentWorkouts.map((workout) => (
                      <div key={workout.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-lg">{workout.name}</h3>
                          <div className="flex gap-2">
                            <Link href={`/dashboard/coaching/students/${selectedStudent.id}/workouts/${workout.id}/edit`}>
                              <Button size="sm" variant="outline">
                                <Icons.edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </Link>
                            <Link href={`/dashboard/coaching/students/${selectedStudent.id}/workouts/${workout.id}`}>
                              <Button size="sm" variant="default">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                        
                        {workout.description && (
                          <p className="text-sm text-muted-foreground mb-3">{workout.description}</p>
                        )}
                        
                        <Separator className="my-3" />
                        
                        <div className="space-y-2">
                          {workout.exercises.map((exerciseData, index) => (
                            <div key={index} className="text-sm">
                              <div className="flex justify-between">
                                <span className="font-medium">{exerciseData.exercise.name}</span>
                                <span>{exerciseData.sets} sets × {exerciseData.reps} reps</span>
                              </div>
                              {exerciseData.weight && (
                                <span className="text-muted-foreground"> · {exerciseData.weight} kg</span>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-3 text-xs text-muted-foreground">
                          Updated {format(new Date(workout.updatedAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 border rounded-md">
                    <p className="text-muted-foreground">No workouts created yet</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={createWorkoutForStudent}
                    >
                      Create First Workout
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activities" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Activities</CardTitle>
                  <CardDescription>{selectedStudent.name}&apos;s tracked habits</CardDescription>
                </div>
                <Button onClick={openCreateActivityDialog}>
                  <Icons.add className="mr-2 h-4 w-4" />
                  Create Activity
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading activities...</div>
                ) : studentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {studentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between rounded-md border p-4">
                        <div className="flex items-center space-x-3">
                           <span
                             className="h-4 w-4 rounded-full"
                             style={{ backgroundColor: activity.colorCode || '#ccc' }}
                           />
                          <div>
                            <p className="font-medium">{activity.name}</p>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground">{activity.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                             Created {format(new Date(activity.createdAt), 'MMM d, yyyy')}
                           </span>
                           <div className="flex gap-1">
                             <Link href={`/dashboard/coaching/students/${selectedStudent.id}/activities/${activity.id}/settings`}>
                               <Button size="sm" variant="outline">
                                 <Icons.edit className="h-4 w-4" />
                               </Button>
                             </Link>
                             <StudentActivityDeleteButton 
                               activityId={activity.id}
                               activityName={activity.name}
                               onDeleted={() => handleActivityCreated()}
                             />
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 border rounded-md">
                    <p className="text-muted-foreground">No activities created yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={openCreateActivityDialog}
                    >
                      Create First Activity
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {selectedStudent && (
        <Dialog open={isCreateActivityDialogOpen} onOpenChange={setIsCreateActivityDialogOpen}>
           {/* Use the actual CreateStudentActivityDialog component */}
           <CreateStudentActivityDialog
             studentId={selectedStudent.id}
             studentName={selectedStudent.name || "this student"} // Provide a fallback name
             onClose={() => setIsCreateActivityDialogOpen(false)}
             onActivityCreated={handleActivityCreated}
           />
         </Dialog>
      )}
    </div>
  )
} 