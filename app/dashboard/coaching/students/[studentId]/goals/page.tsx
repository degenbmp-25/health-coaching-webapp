"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Icons } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Target, Plus } from "lucide-react"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

export default function StudentGoalsPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [studentName, setStudentName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchStudentGoals() {
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
        
        // Fetch student goals
        const goalsResponse = await fetch(`/api/users/${params.studentId}/goals`)
        
        if (!goalsResponse.ok) {
          throw new Error("Failed to fetch student goals")
        }
        
        const goalsData = await goalsResponse.json()
        setGoals(goalsData)
      } catch (error) {
        console.error("Error fetching student goals:", error)
        setError("Failed to load goals. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchStudentGoals()
  }, [params.studentId, user?.id])

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

      // If creating new goal for student, need to specify the student's user ID
      const payload = !editingGoal ? { ...data, userId: params.studentId } : data

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
      
      // Refresh goals
      const goalsResponse = await fetch(`/api/users/${params.studentId}/goals`)
      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json()
        setGoals(goalsData)
      }
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

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return

    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete goal")

      toast({
        title: "Goal deleted",
        description: "The goal has been deleted successfully",
      })

      // Refresh goals
      const goalsResponse = await fetch(`/api/users/${params.studentId}/goals`)
      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json()
        setGoals(goalsData)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      })
    }
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
        heading={`${studentName}'s Goals`}
        text="Manage and track your student's fitness goals"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSaveGoal}>
                <DialogHeader>
                  <DialogTitle>
                    Create Goal for {studentName}
                  </DialogTitle>
                  <DialogDescription>
                    Set a new goal to help guide their progress
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
                <h3 className="font-medium text-lg mb-1">Failed to load goals</h3>
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
        ) : goals.length === 0 ? (
          <Card>
            <CardContent className="p-10">
              <div className="flex flex-col items-center justify-center text-center">
                <Target className="h-8 w-8 text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg mb-1">No Goals Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a goal to help guide {studentName}&apos;s progress.
                </p>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Goal
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {goals.map((goal) => (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {goal.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <CardTitle className={`text-lg ${goal.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                          {goal.title}
                        </CardTitle>
                        {goal.description && (
                          <CardDescription>{goal.description}</CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {goal.lastEditedByCoach && (
                        <Badge variant="outline">Coach edited</Badge>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingGoal(goal)}
                          >
                            <Icons.edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <form onSubmit={handleSaveGoal}>
                            <DialogHeader>
                              <DialogTitle>
                                Edit {studentName}&apos;s Goal
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {goal.targetDate && (
                      <div className="flex items-center gap-1">
                        <Icons.calendar className="h-4 w-4" />
                        Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Icons.clock className="h-4 w-4" />
                      Created: {format(new Date(goal.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}