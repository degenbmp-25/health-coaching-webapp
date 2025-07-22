"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Activity } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/icons"
import { Target, Plus, CheckCircle2, Circle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

interface Goal {
  id: string
  title: string
  description?: string | null
  targetDate?: string | null
  isCompleted: boolean
  lastEditedByCoach: boolean
}

interface HabitLoggingPanelProps {
  userId: string
  activities: Activity[]
}

export function HabitLoggingPanel({ userId, activities }: HabitLoggingPanelProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loggingActivity, setLoggingActivity] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchGoals()
  }, [userId])

  const fetchGoals = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/goals`)
      if (response.ok) {
        const data = await response.json()
        setGoals(data.slice(0, 2)) // Show only first 2 goals for compact view
      }
    } catch (error) {
      console.error("Error fetching goals:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleComplete = async (goal: Goal) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !goal.isCompleted }),
      })

      if (!response.ok) throw new Error("Failed to update goal")

      toast({
        title: "Goal updated",
        description: `Goal marked as ${!goal.isCompleted ? "completed" : "incomplete"}`,
      })
      fetchGoals()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const displayActivities = activities.slice(0, 4) // Show max 4 activities

  const handleQuickLog = async (activityId: string) => {
    setLoggingActivity(activityId)

    const dateToday = new Date()
    dateToday.setHours(0, 0, 0, 0)

    try {
      const response = await fetch(`/api/activities/${activityId}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: dateToday,
          count: 1,
        }),
      })

      if (!response?.ok) {
        toast({
          title: "Something went wrong.",
          description: "Your activity was not logged. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          description: "Your activity has been logged successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log activity",
        variant: "destructive",
      })
    } finally {
      setLoggingActivity(null)
      router.refresh()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Quick Habit Logging */}
      <Card className="border-green-200 dark:border-green-800">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Icons.activity className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <span className="truncate">Quick Log Activities</span>
            </CardTitle>
            <Link href="/dashboard/activities">
              <Button size="sm" variant="ghost" className="text-xs whitespace-nowrap">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {displayActivities.length === 0 ? (
            <div className="text-center py-6">
              <Icons.activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No activities yet</p>
              <Link href="/dashboard/activities">
                <Button size="sm" variant="outline" className="mt-3">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Activity
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {displayActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 sm:p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: activity.colorCode }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-xs font-medium truncate">{activity.name}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleQuickLog(activity.id)}
                    disabled={loggingActivity === activity.id}
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 sm:h-9 sm:w-9 shrink-0"
                  >
                    {loggingActivity === activity.id ? (
                      <Icons.spinner className="h-5 w-5 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
              ))}
              {activities.length > 4 && (
                <div className="text-center pt-3">
                  <Link href="/dashboard/activities">
                    <Button size="sm" variant="ghost" className="text-xs">
                      +{activities.length - 4} more activities
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Goals */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-3 px-4 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="truncate">Active Goals</span>
            </CardTitle>
            <Link href="/dashboard/goals">
              <Button size="sm" variant="ghost" className="text-xs whitespace-nowrap">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4">Loading goals...</div>
          ) : goals.length === 0 ? (
            <div className="text-center py-6">
              <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No goals yet</p>
              <Link href="/dashboard/goals">
                <Button size="sm" variant="outline" className="mt-3">
                  <Plus className="mr-2 h-4 w-4" />
                  Set Goal
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-3 p-3 sm:p-2 rounded-lg border bg-muted/30">
                  <button
                    onClick={() => handleToggleComplete(goal)}
                    disabled={isSaving}
                    className="shrink-0 touch-target flex items-center justify-center"
                  >
                    {goal.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 sm:h-4 sm:w-4 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 sm:h-4 sm:w-4 text-muted-foreground" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm sm:text-xs font-medium ${goal.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                      {goal.title}
                    </div>
                    {goal.lastEditedByCoach && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Coach edited
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {goals.length >= 2 && (
                <div className="text-center pt-3">
                  <Link href="/dashboard/goals">
                    <Button size="sm" variant="ghost" className="text-xs">
                      View all goals
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 