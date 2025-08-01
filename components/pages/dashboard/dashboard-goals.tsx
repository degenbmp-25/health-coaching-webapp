"use client"

import { useState, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { CheckCircle2, Circle, Target, Plus, Edit2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

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

interface DashboardGoalsProps {
  userId: string
  isCoach?: boolean
  studentName?: string
}

export function DashboardGoals({ userId, isCoach = false, studentName }: DashboardGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${userId}/goals`)
      if (response.ok) {
        const data = await response.json()
        setGoals(data.slice(0, 3)) // Show only first 3 goals
      }
    } catch (error) {
      console.error("Error fetching goals:", error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchGoals()
  }, [userId, fetchGoals])

  const handleToggleComplete = async (goal: Goal) => {
    if (isCoach) return // Coaches can't toggle completion

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

  const handleSaveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      targetDate: formData.get("targetDate") as string,
    }

    try {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals"
      const method = editingGoal ? "PATCH" : "POST"

      // If coach is creating/editing, need to specify the student's user ID
      const payload = isCoach && !editingGoal ? { ...data, userId } : data

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Failed to save goal")

      toast({
        title: editingGoal ? "Goal updated" : "Goal created",
        description: `Goal has been ${editingGoal ? "updated" : "created"} successfully`,
      })

      setEditingGoal(null)
      setIsCreateOpen(false)
      fetchGoals()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save goal",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isCoach && studentName ? `${studentName}'s Goals` : "Your Goals"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading goals...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isCoach && studentName ? `${studentName}'s Goals` : "Your Goals"}
          </CardTitle>
          <div className="flex items-center gap-2">
            {(isCoach || !isCoach) && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    {isCoach ? "Add Goal" : "New Goal"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSaveGoal}>
                    <DialogHeader>
                      <DialogTitle>
                        {isCoach ? `Create Goal for ${studentName}` : "Create New Goal"}
                      </DialogTitle>
                      <DialogDescription>
                        Set a new goal to track progress
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          name="title"
                          placeholder="e.g., Lose 10 pounds"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Add more details about the goal..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="targetDate">Target Date</Label>
                        <Input
                          id="targetDate"
                          name="targetDate"
                          type="date"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isSaving}>
                        Create Goal
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
            <Link href={isCoach ? `/dashboard/coaching/students/${userId}/goals` : "/dashboard/goals"}>
              <Button size="sm" variant="ghost">
                View All
              </Button>
            </Link>
          </div>
        </div>
        <CardDescription>
          {isCoach 
            ? "Manage and track your student's fitness goals"
            : "Track your fitness goals and milestones"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-6">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {isCoach ? `${studentName} has no goals yet` : "No goals yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isCoach ? "Create a goal to help guide their progress" : "Create a goal to start tracking your progress"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <button
                  onClick={() => handleToggleComplete(goal)}
                  disabled={isSaving || isCoach}
                  className="mt-0.5"
                >
                  {goal.isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${goal.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                    {goal.title}
                  </div>
                  {goal.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {goal.description}
                    </div>
                  )}
                  {goal.targetDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {goal.lastEditedByCoach && (
                      <Badge variant="outline" className="text-xs">
                        Coach edited
                      </Badge>
                    )}
                  </div>
                </div>
                {(isCoach || !goal.lastEditedByCoach) && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingGoal(goal)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleSaveGoal}>
                        <DialogHeader>
                          <DialogTitle>
                            {isCoach ? `Edit ${studentName}'s Goal` : "Edit Goal"}
                          </DialogTitle>
                          <DialogDescription>
                            Update the goal details
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                              id="edit-title"
                              name="title"
                              defaultValue={goal.title}
                              required
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                              id="edit-description"
                              name="description"
                              defaultValue={goal.description || ""}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-targetDate">Target Date</Label>
                            <Input
                              id="edit-targetDate"
                              name="targetDate"
                              type="date"
                              defaultValue={goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ""}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={isSaving}>
                            Save Changes
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 