"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const workoutFormSchema = z.object({
  name: z.string().min(3, {
    message: "Workout name must be at least 3 characters.",
  }),
  description: z.string().optional(),
  weekNumber: z.number().int().min(1).max(52).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      sets: z.coerce.number().min(1),
      reps: z.coerce.number().min(1),
      weight: z.coerce.number().optional(),
      notes: z.string().optional(),
      // Store organizationVideoId to always get correct muxPlaybackId from organization_videos
      organizationVideoId: z.string().optional().nullable(),
    })
  ),
})

type FormData = z.infer<typeof workoutFormSchema>

interface Exercise {
  id: string
  name: string
  category: string
  muscleGroup: string
}

interface OrganizationVideo {
  id: string
  organizationId: string
  muxAssetId: string
  muxPlaybackId: string | null
  title: string
  thumbnailUrl: string | null
  duration: number | null
  status: string
  createdAt: Date
  updatedAt: Date
}

interface WorkoutEditFormProps {
  workout: {
    id: string
    name: string
    description: string | null
    weekNumber?: number | null
    dayOfWeek?: number | null
    exercises?: {
      id: string
      name: string
      sets: number
      reps: number
      weight?: number | null
      notes?: string | null
      muxPlaybackId?: string | null
      organizationVideoId?: string | null
    }[]
  }
  exercises: Exercise[]
  redirectUrl?: string
  videos?: OrganizationVideo[]
  isTrainer?: boolean
  onSaved?: () => void | Promise<void>
  submitLabel?: string
}

export function WorkoutEditForm({ 
  workout, 
  exercises, 
  redirectUrl,
  videos = [],
  isTrainer = false,
  onSaved,
  submitLabel,
}: WorkoutEditFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = React.useState<boolean>(false)
  const [exerciseOptions, setExerciseOptions] = React.useState<Exercise[]>(exercises)
  const [createExerciseOpen, setCreateExerciseOpen] = React.useState(false)
  const [createExerciseIndex, setCreateExerciseIndex] = React.useState<number | null>(null)
  const [isCreatingExercise, setIsCreatingExercise] = React.useState(false)
  const [newExercise, setNewExercise] = React.useState({
    name: "",
    category: "",
    muscleGroup: "",
    equipment: "",
    description: "",
  })

  React.useEffect(() => {
    setExerciseOptions(exercises)
  }, [exercises])

  // Filter to only ready videos with valid muxPlaybackId
  const readyVideos = videos.filter(v => v.status === 'ready' && v.muxPlaybackId != null)

  const form = useForm<FormData>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      name: workout.name,
      description: workout.description || "",
      weekNumber: workout.weekNumber ?? undefined,
      dayOfWeek: workout.dayOfWeek ?? undefined,
      exercises: workout.exercises?.map(exercise => ({
        exerciseId: exercise.id,
        sets: exercise.sets,
        reps: exercise.reps,
        weight: exercise.weight || undefined,
        notes: exercise.notes || undefined,
        // Store organizationVideoId for correct video reference
        organizationVideoId: (exercise as any).organizationVideoId || undefined,
      })) || [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: "exercises",
    control: form.control,
  })

  const selectableExercises = React.useMemo(() => {
    const exerciseIds = new Set(exerciseOptions.map((exercise) => exercise.id))
    const currentWorkoutExercises = (workout.exercises || [])
      .filter((exercise) => !exerciseIds.has(exercise.id))
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        category: "Current workout",
        muscleGroup: "Current workout",
      }))

    return [...currentWorkoutExercises, ...exerciseOptions]
  }, [exerciseOptions, workout.exercises])

  // Group exercises by category
  const exercisesByCategory = selectableExercises.reduce((acc, exercise) => {
    const categoryKey = exercise.category?.trim();
    if (!categoryKey) {
      return acc; // Skip exercises without a valid category
    }
    if (!acc[categoryKey]) {
      acc[categoryKey] = []
    }
    acc[categoryKey].push(exercise)
    return acc
  }, {} as Record<string, Exercise[]>)

  function openCreateExercise(index: number) {
    setCreateExerciseIndex(index)
    setNewExercise({
      name: "",
      category: "",
      muscleGroup: "",
      equipment: "",
      description: "",
    })
    setCreateExerciseOpen(true)
  }

  async function createExercise() {
    if (!newExercise.name.trim() || !newExercise.category.trim() || !newExercise.muscleGroup.trim()) {
      toast({
        title: "Exercise needs a little more info.",
        description: "Name, category, and muscle group are required.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingExercise(true)

    try {
      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newExercise.name.trim(),
          category: newExercise.category.trim(),
          muscleGroup: newExercise.muscleGroup.trim(),
          equipment: newExercise.equipment.trim() || undefined,
          description: newExercise.description.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Exercise was not created.")
      }

      const createdExercise = await response.json()
      setExerciseOptions((current) => {
        if (current.some((exercise) => exercise.id === createdExercise.id)) {
          return current
        }

        return [...current, createdExercise].sort((a, b) => a.name.localeCompare(b.name))
      })

      if (createExerciseIndex !== null) {
        form.setValue(`exercises.${createExerciseIndex}.exerciseId`, createdExercise.id, {
          shouldDirty: true,
          shouldValidate: true,
        })
      }

      toast({
        title: "Exercise created",
        description: `${createdExercise.name} is ready to use.`,
      })

      setCreateExerciseOpen(false)
    } catch (error) {
      toast({
        title: "Something went wrong.",
        description: error instanceof Error ? error.message : "Exercise was not created.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingExercise(false)
    }
  }

  async function onSubmit(data: FormData) {
    setIsSaving(true)

    const isCreating = !workout.id
    const method = isCreating ? "POST" : "PATCH"
    const endpoint = isCreating ? "/api/workouts" : `/api/workouts/${workout.id}`

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          weekNumber: data.weekNumber,
          dayOfWeek: data.dayOfWeek,
          exercises: data.exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            notes: exercise.notes,
            order: index,
            // Send organizationVideoId to correctly reference the video
            organizationVideoId: exercise.organizationVideoId || null,
          })),
        }),
      })

      if (!response.ok) {
        let errorMsg = `Your workout was not ${isCreating ? 'created' : 'updated'}. Please try again.`
        try {
          const errorData = await response.json();
          if (Array.isArray(errorData) && errorData[0]?.path) {
             errorMsg = errorData.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
          }
        } catch (e) { /* Ignore if response body isn't specific error JSON */ }
        throw new Error(errorMsg);
      }

      let savedWorkoutId = workout.id;
      if (isCreating) {
        const responseData = await response.json()
        savedWorkoutId = responseData.id
      }

      toast({
        title: isCreating ? "Workout Created" : "Workout Updated",
        description: `"${data.name}" has been saved.`,
      })

      if (onSaved) {
        await onSaved()
      } else {
        router.push(redirectUrl || (isCreating ? `/dashboard/workouts/${savedWorkoutId}/edit` : `/dashboard/workouts`));
      }
      router.refresh()

    } catch (error) {
      console.error(`Error ${isCreating ? 'creating' : 'updating'} workout:`, error);
      toast({
        title: "Something went wrong.",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workout Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter workout name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter workout description"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Scheduling: Week and Day selectors */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="weekNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Week Number</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                    value={field.value === null || field.value === undefined ? "none" : String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                        <SelectItem key={w} value={String(w)}>Week {w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day of Week</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))}
                    value={field.value === null || field.value === undefined ? "none" : String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                        <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Exercises</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  exerciseId: "",
                  sets: 3,
                  reps: 10,
                  weight: undefined,
                  notes: "",
                  organizationVideoId: undefined,
                })
              }
            >
              <Icons.add className="mr-2 h-4 w-4" />
              Add Exercise
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <Card key={field.id} className="p-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Exercise {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Icons.trash className="h-4 w-4" />
                      <span className="sr-only">Remove exercise</span>
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.exerciseId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exercise</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select exercise" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <ScrollArea className="h-[300px]">
                                {Object.entries(exercisesByCategory).map(([category, exercises]) => (
                                  <SelectGroup key={category}>
                                    <SelectLabel>{category}</SelectLabel>
                                    {exercises.map((exercise) => (
                                      <SelectItem
                                        key={exercise.id}
                                        value={exercise.id}
                                      >
                                        {exercise.name}
                                      </SelectItem>
                                    ))}
                                    <SelectSeparator />
                                  </SelectGroup>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-xs"
                            onClick={() => openCreateExercise(index)}
                          >
                            Create a new exercise
                          </Button>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name={`exercises.${index}.sets`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sets</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`exercises.${index}.reps`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reps</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`exercises.${index}.weight`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Weight (kg)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name={`exercises.${index}.notes`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Optional notes (e.g., 'Focus on form')"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Video Selector - only show for trainers */}
                  {isTrainer && (
                    <FormField
                      control={form.control}
                      name={`exercises.${index}.organizationVideoId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                            value={field.value ?? "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select video (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No video</SelectItem>
                              {readyVideos.map((video) => (
                                <SelectItem 
                                  key={video.id} 
                                  value={video.id}
                                >
                                  {video.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {readyVideos.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No videos yet. <Link href="/trainer/videos" className="underline">Upload one</Link>
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isSaving}>
          {isSaving && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          <span>{submitLabel || (workout.id ? "Save Changes" : "Create Workout")}</span>
        </Button>
      </form>

      <Dialog open={createExerciseOpen} onOpenChange={setCreateExerciseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Exercise</DialogTitle>
            <DialogDescription>
              Add it once, then use it in this workout and future programs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <FormLabel>Name</FormLabel>
              <Input
                value={newExercise.name}
                onChange={(event) => setNewExercise((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Half-kneeling cable chop"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <FormLabel>Category</FormLabel>
                <Input
                  value={newExercise.category}
                  onChange={(event) => setNewExercise((current) => ({ ...current, category: event.target.value }))}
                  placeholder="e.g. Strength"
                />
              </div>
              <div className="space-y-2">
                <FormLabel>Muscle Group</FormLabel>
                <Input
                  value={newExercise.muscleGroup}
                  onChange={(event) => setNewExercise((current) => ({ ...current, muscleGroup: event.target.value }))}
                  placeholder="e.g. Core"
                />
              </div>
            </div>
            <div className="space-y-2">
              <FormLabel>Equipment</FormLabel>
              <Input
                value={newExercise.equipment}
                onChange={(event) => setNewExercise((current) => ({ ...current, equipment: event.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <FormLabel>Description</FormLabel>
              <Textarea
                value={newExercise.description}
                onChange={(event) => setNewExercise((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional coaching notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateExerciseOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={createExercise} disabled={isCreatingExercise}>
                {isCreatingExercise && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Create Exercise
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
