"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { CheckCircle2, Circle, Target, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Goal {
  id: string
  title: string
  description?: string | null
  targetDate?: string | null
  isCompleted: boolean
  lastEditedByCoach: boolean
  createdAt: string
  updatedAt: string
}

interface GoalsWidgetProps {
  userId?: string
  title?: string
  showCreateButton?: boolean
  limit?: number
}

export function GoalsWidget({ 
  userId, 
  title = "Goals", 
  showCreateButton = false,
  limit = 3 
}: GoalsWidgetProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const endpoint = userId ? `/api/users/${userId}/goals` : '/api/goals'
        const response = await fetch(endpoint)
        if (response.ok) {
          const goalsData = await response.json()
          setGoals(goalsData)
        }
      } catch (error) {
        console.error('Failed to fetch goals:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGoals()
  }, [userId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading goals...</div>
        </CardContent>
      </Card>
    )
  }

  const displayGoals = goals.slice(0, limit)
  const completedCount = goals.filter(goal => goal.isCompleted).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title}
          </CardTitle>
          {showCreateButton && (
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Goal
            </Button>
          )}
        </div>
        {goals.length > 0 && (
          <CardDescription>
            {completedCount} of {goals.length} completed
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-4">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No goals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayGoals.map((goal) => (
              <div key={goal.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {goal.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${goal.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                    {goal.title}
                  </div>
                  {goal.targetDate && (
                    <div className="text-xs text-muted-foreground">
                      Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                    </div>
                  )}
                  {goal.lastEditedByCoach && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Coach edited
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {goals.length > limit && (
              <div className="text-center pt-2">
                <div className="text-xs text-muted-foreground">
                  +{goals.length - limit} more goals
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 