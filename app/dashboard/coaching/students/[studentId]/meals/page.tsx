"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { format } from "date-fns"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Icons } from "@/components/icons"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"

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
  createdAt: string | Date
}

export default function StudentMealsPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const [meals, setMeals] = useState<Meal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [studentName, setStudentName] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudentMeals() {
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
        
        // Fetch student meals
        const dateParam = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
        const mealsResponse = await fetch(
          `/api/users/${params.studentId}/meals${dateParam ? `?date=${dateParam}` : ''}`
        )
        
        if (!mealsResponse.ok) {
          throw new Error("Failed to fetch student meals")
        }
        
        const mealsData = await mealsResponse.json()
        setMeals(mealsData)
      } catch (error) {
        console.error("Error fetching student meals:", error)
        setError("Failed to load meals. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudentMeals()
  }, [params.studentId, user?.id, selectedDate])

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
        heading={`${studentName}'s Meals`}
        text="View your student's meal history and nutrition tracking"
      >
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
      </DashboardHeader>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to view meals</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
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
                  <h3 className="font-medium text-lg mb-1">Failed to load meals</h3>
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
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    Meals for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'All dates'}
                  </CardTitle>
                  <CardDescription>
                    {meals.length} {meals.length === 1 ? 'meal' : 'meals'} recorded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {meals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 border rounded-md">
                      <Icons.meal className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No meals recorded for this date</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {meals.map((meal) => (
                        <div key={meal.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-lg">{meal.name}</h4>
                              {meal.description && (
                                <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(meal.date), 'h:mm a')}
                            </span>
                          </div>
                          
                          {meal.imageUrl && (
                            <div className="mt-3 rounded-md overflow-hidden h-48 w-full relative">
                              <Image 
                                src={meal.imageUrl} 
                                alt={meal.name}
                                fill
                                className="object-cover" 
                              />
                            </div>
                          )}
                          
                          <Separator className="my-3" />
                          
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold">{meal.calories}</p>
                              <p className="text-xs text-muted-foreground">Calories</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{meal.protein}g</p>
                              <p className="text-xs text-muted-foreground">Protein</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{meal.carbs}g</p>
                              <p className="text-xs text-muted-foreground">Carbs</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold">{meal.fat}g</p>
                              <p className="text-xs text-muted-foreground">Fat</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {meals.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Summary</CardTitle>
                    <CardDescription>Total nutrition for {format(selectedDate || new Date(), 'MMMM d, yyyy')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-3xl font-bold text-orange-600">
                          {meals.reduce((sum, meal) => sum + meal.calories, 0)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Calories</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-blue-600">
                          {meals.reduce((sum, meal) => sum + meal.protein, 0)}g
                        </p>
                        <p className="text-sm text-muted-foreground">Total Protein</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-600">
                          {meals.reduce((sum, meal) => sum + meal.carbs, 0)}g
                        </p>
                        <p className="text-sm text-muted-foreground">Total Carbs</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-yellow-600">
                          {meals.reduce((sum, meal) => sum + meal.fat, 0)}g
                        </p>
                        <p className="text-sm text-muted-foreground">Total Fat</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </Shell>
  )
}