"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CheckCircle2, Circle, Edit2, Trash2, Target } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

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

interface GoalsListProps {
  goals: Goal[]
  userId?: string
  isCoach?: boolean
  onGoalUpdate?: () => void
}

export function GoalsList({ goals, userId, isCoach = false, onGoalUpdate }: GoalsListProps) {
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggleComplete = async (goal: Goal) => {
    setIsLoading(true)
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
      onGoalUpdate?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete goal")

      toast({
        title: "Goal deleted",
        description: "Goal has been deleted successfully",
      })
      onGoalUpdate?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      targetDate: formData.get("targetDate") as string,
    }

    try {
      const url = editingGoal ? `/api/goals/${editingGoal.id}` : "/api/goals"
      const method = editingGoal ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to save goal")

      toast({
        title: editingGoal ? "Goal updated" : "Goal created",
        description: "Goal has been saved successfully",
      })

      setEditingGoal(null)
      setIsCreateOpen(false)
      onGoalUpdate?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save goal",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Goals</h2>
        {!isCoach && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Target className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSaveGoal}>
                <DialogHeader>
                  <DialogTitle>Create New Goal</DialogTitle>
                  <DialogDescription>
                    Set a new goal to track your progress
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
                      placeholder="Add more details about your goal..."
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
                  <Button type="submit" disabled={isLoading}>
                    Create Goal
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No goals yet</p>
            {!isCoach && (
                            <p className="text-sm text-muted-foreground">                Click &quot;Add Goal&quot; to create your first goal              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {goals.map((goal) => (
            <Card key={goal.id} className={goal.isCompleted ? "opacity-75" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleComplete(goal)}
                      disabled={isLoading || isCoach}
                      className="mt-1"
                    >
                      {goal.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div>
                      <CardTitle className={goal.isCompleted ? "line-through" : ""}>
                        {goal.title}
                      </CardTitle>
                      {goal.targetDate && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingGoal(goal)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <form onSubmit={handleSaveGoal}>
                          <DialogHeader>
                            <DialogTitle>Edit Goal</DialogTitle>
                            <DialogDescription>
                              Update your goal details
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
                            <Button type="submit" disabled={isLoading}>
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    {!isCoach && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(goal.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {goal.description && (
                <CardContent>
                  <CardDescription>{goal.description}</CardDescription>
                  {goal.lastEditedByCoach && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last edited by coach
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 