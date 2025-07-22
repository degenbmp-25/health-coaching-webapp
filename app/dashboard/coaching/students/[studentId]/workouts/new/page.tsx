"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger, 
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Icons } from "@/components/icons"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Exercise {
  id: string
  name: string
  category: string
  muscleGroup: string
  description?: string
  equipment?: string
  imageUrl?: string
}

// Component for advanced exercise selector
function ExerciseSelector({ 
  value, 
  onChange, 
  exercises,
  name,
  setIsCreateExerciseDialogOpen
}: { 
  value: string
  onChange: (value: string) => void
  exercises: Exercise[]
  name: string
  setIsCreateExerciseDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  
  // Get unique muscle groups
  const muscleGroups = Array.from(new Set(exercises.map(e => e.muscleGroup))).sort()
  
  // Filter exercises based on search and selected group
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = searchQuery === "" || 
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesGroup = selectedGroup === null || exercise.muscleGroup === selectedGroup
    
    return matchesSearch && matchesGroup
  })
  
  // Find the selected exercise name
  const selectedExercise = exercises.find(exercise => exercise.id === value)
  
  // Group exercises by muscle group for display
  const groupedExercises: Record<string, Exercise[]> = {}
  
  for (const group of muscleGroups) {
    const groupExercises = filteredExercises.filter(e => e.muscleGroup === group)
    if (groupExercises.length > 0) {
      groupedExercises[group] = groupExercises.sort((a, b) => a.name.localeCompare(b.name))
    }
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          {value && selectedExercise
            ? (
              <div className="flex flex-col items-start">
                <span>{selectedExercise.name}</span>
                <span className="text-xs text-muted-foreground">{selectedExercise.muscleGroup}</span>
              </div>
            )
            : "Select an exercise"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {/* Filter pills */}
          <div className="border-b px-2 py-2 flex gap-1 flex-wrap">
            {muscleGroups.map(group => (
              <Badge 
                key={group} 
                variant={selectedGroup === group ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedGroup(selectedGroup === group ? null : group)}
              >
                {group}
              </Badge>
            ))}
            {selectedGroup && (
              <Badge 
                variant="secondary"
                className="cursor-pointer ml-auto"
                onClick={() => setSelectedGroup(null)}
              >
                Clear
              </Badge>
            )}
          </div>
          
          {/* Exercise list */}
          <div className="max-h-[300px] overflow-y-auto">
            {Object.keys(groupedExercises).length === 0 && searchQuery === "" && selectedGroup === null ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Start typing to search or select a filter.
              </div>
            ) : Object.keys(groupedExercises).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No exercises found
              </div>
            ) : (
              Object.entries(groupedExercises).map(([group, groupExercises]) => (
                <div key={group}>
                  <div className="sticky top-0 bg-muted/50 px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    {group}
                  </div>
                  <div>
                    {groupExercises.map(exercise => (
                      <div
                        key={exercise.id}
                        className={cn(
                          "flex items-center justify-between w-full px-2 py-1.5 text-sm cursor-pointer hover:bg-muted",
                          value === exercise.id && "bg-accent"
                        )}
                        onClick={() => {
                          onChange(exercise.id)
                          setOpen(false)
                        }}
                      >
                        <div className="flex flex-col">
                          <span>{exercise.name}</span>
                          <span className="text-xs text-muted-foreground">{exercise.category}</span>
                        </div>
                        {value === exercise.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Button to create new exercise */}
          <div className="p-2 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setIsCreateExerciseDialogOpen(true);
                setOpen(false);
              }}
            >
              <Icons.add className="mr-2 h-4 w-4" />
              Create New Exercise
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Workout name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      sets: z.coerce.number().min(1),
      reps: z.coerce.number().min(1),
      weight: z.coerce.number().optional(),
      notes: z.string().optional(),
    })
  ),
})

type FormValues = z.infer<typeof formSchema>

// Schema for the custom exercise form
const customExerciseSchema = z.object({
  name: z.string().min(3, "Exercise name must be at least 3 characters."),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required."), // E.g., Strength, Cardio, Flexibility
  muscleGroup: z.string().min(1, "Muscle group is required."), // E.g., Chest, Back, Legs, Biceps
  equipment: z.string().optional(), // E.g., Dumbbell, Barbell, None
})

type CustomExerciseFormValues = z.infer<typeof customExerciseSchema>

export default function CreateStudentWorkoutPage({
  params,
}: {
  params: { studentId: string }
}) {
  const router = useRouter()
  const { user } = useUser()
  const [isSaving, setIsSaving] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [studentName, setStudentName] = useState<string>("")
  const [isCreateExerciseDialogOpen, setIsCreateExerciseDialogOpen] = useState(false)
  const [isCreatingExercise, setIsCreatingExercise] = useState(false)
  
  const workoutForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      exercises: [{ exerciseId: "", sets: 3, reps: 10, weight: undefined, notes: "" }],
    },
  })

  const customExerciseForm = useForm<CustomExerciseFormValues>({
    resolver: zodResolver(customExerciseSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      muscleGroup: "",
      equipment: "",
    },
  })

  // Function to be passed to ExerciseSelector to open the dialog
  const openCreateExerciseDialog = () => {
    setIsCreateExerciseDialogOpen(true);
  };

  useEffect(() => {
    async function fetchExercisesAndStudent() {
      // Combined fetch logic
      try {
        const exercisesResponse = await fetch("/api/exercises")
        if (!exercisesResponse.ok) throw new Error("Failed to fetch exercises")
        const exercisesData = await exercisesResponse.json()
        setExercises(exercisesData)

        if (user?.id) {
          const studentResponse = await fetch(`/api/users/${params.studentId}`)
          if (!studentResponse.ok) throw new Error("Failed to fetch student details")
          const studentData = await studentResponse.json()
          setStudentName(studentData.name || "Student")
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        // Potentially set an error state here to show in UI
      }
    }
    fetchExercisesAndStudent();
  }, [params.studentId, user?.id, isCreateExerciseDialogOpen]) // Re-fetch if dialog was opened and potentially new exercise added

  async function handleCreateCustomExercise(data: CustomExerciseFormValues) {
    if (!user?.id) return;
    setIsCreatingExercise(true);
    try {
      const response = await fetch("/api/exercises", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          userId: user.id, 
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create custom exercise");
      }
      
      setIsCreateExerciseDialogOpen(false); 
      customExerciseForm.reset(); 
      
      const refreshedExercisesResponse = await fetch("/api/exercises"); 
      if (!refreshedExercisesResponse.ok) throw new Error("Failed to re-fetch exercises after creation"); // Added error handling
      const refreshedExercisesData = await refreshedExercisesResponse.json();
      setExercises(refreshedExercisesData);
      // toast({ title: "Custom Exercise Created!" });
    } catch (error) {
      console.error("Error creating custom exercise:", error);
      // toast({ title: "Error", description: "Could not create custom exercise.", variant: "destructive" });
    } finally {
      setIsCreatingExercise(false);
    }
  }

  function addExercise() {
    const currentExercises = workoutForm.getValues("exercises")
    workoutForm.setValue("exercises", [
      ...currentExercises,
      { exerciseId: "", sets: 3, reps: 10, weight: undefined, notes: "" },
    ])
  }

  function removeExercise(index: number) {
    const currentExercises = workoutForm.getValues("exercises")
    workoutForm.setValue(
      "exercises",
      currentExercises.filter((_, i) => i !== index)
    )
  }

  async function onSubmit(data: FormValues) {
    if (!user?.id) return

    setIsSaving(true)
    
    try {
      // Add order to exercises
      const exercises = data.exercises.map((exercise, index) => ({
        ...exercise,
        order: index,
      }))
      
      const response = await fetch(`/api/users/${params.studentId}/workouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          exercises,
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to create workout")
      }
      
      router.push(`/dashboard/coaching`)
    } catch (error) {
      console.error("Error creating workout:", error)
    } finally {
      setIsSaving(false)
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
        heading={`Create Workout for ${studentName}`}
        text="Create a personalized workout for your student"
      >
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </DashboardHeader>
      
      <Form {...workoutForm}>
        <form onSubmit={workoutForm.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Workout Details</CardTitle>
              <CardDescription>
                Create a workout plan for your student
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={workoutForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workout Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Upper Body Strength" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the workout plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={workoutForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Description and goals of this workout" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Add notes or instructions for your student
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Exercises</CardTitle>
                  <CardDescription>
                    Add exercises to the workout plan
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExercise}
                >
                  <Icons.add className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {workoutForm.watch("exercises").map((_, index) => (
                <div key={index} className="space-y-4">
                  {index > 0 && <Separator />}
                  <div className="flex justify-between items-center pt-2">
                    <h3 className="text-sm font-medium">Exercise {index + 1}</h3>
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExercise(index)}
                        className="h-8 px-2 text-destructive"
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={workoutForm.control}
                      name={`exercises.${index}.exerciseId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exercise</FormLabel>
                          <FormControl>
                            <ExerciseSelector 
                              value={field.value} 
                              onChange={field.onChange}
                              exercises={exercises}
                              name={field.name}
                              setIsCreateExerciseDialogOpen={setIsCreateExerciseDialogOpen}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={workoutForm.control}
                        name={`exercises.${index}.sets`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sets</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={workoutForm.control}
                        name={`exercises.${index}.reps`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reps</FormLabel>
                            <FormControl>
                              <Input type="number" min={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={workoutForm.control}
                      name={`exercises.${index}.weight`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg) - Optional</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              step={0.5} 
                              {...field}
                              value={field.value === undefined ? "" : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={workoutForm.control}
                      name={`exercises.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes - Optional</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="E.g., Pause at bottom" 
                              {...field} 
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Workout"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {/* Dialog for Creating Custom Exercise */}
      <Dialog open={isCreateExerciseDialogOpen} onOpenChange={setIsCreateExerciseDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...customExerciseForm}>
            <form onSubmit={customExerciseForm.handleSubmit(handleCreateCustomExercise)} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Create New Custom Exercise</DialogTitle>
                <DialogDescription>
                  Add a new exercise to your personal library. This will be available for you to select in the future.
                </DialogDescription>
              </DialogHeader>
              
              <FormField
                control={customExerciseForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exercise Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Barbell Bench Press" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customExerciseForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Focus on controlled movement..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customExerciseForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      {/* TODO: Consider using a Select component if categories are predefined */}
                      <Input placeholder="e.g., Strength, Cardio, Plyometrics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customExerciseForm.control}
                name="muscleGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Muscle Group</FormLabel>
                    <FormControl>
                      {/* TODO: Consider using a Select component for consistency */}
                      <Input placeholder="e.g., Chest, Back, Quads, Hamstrings" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={customExerciseForm.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Barbell, Dumbbells, None" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateExerciseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreatingExercise}>
                  {isCreatingExercise ? (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Exercise
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Shell>
  )
} 