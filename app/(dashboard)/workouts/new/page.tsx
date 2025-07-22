import { WorkoutEditForm } from "@/components/workout/workout-edit-form"
import { db } from "@/lib/db"

export const dynamic = 'force-dynamic'

export default async function NewWorkoutPage() {
  // Log entry point
  console.error("--- Loading NewWorkoutPage ---");

  // Fetch all exercises
  const exercises = await db.exercise.findMany({
    orderBy: {
      name: 'asc',
    },
  })

  // Log the fetched exercises using console.error
  console.error("Fetched exercises for new workout page:", JSON.stringify(exercises, null, 2));

  // Create empty workout data
  const workoutData = {
    id: "",
    name: "",
    description: "",
    exercises: [],
  }

  return (
    <div className="container mx-auto py-8">
      <WorkoutEditForm workout={workoutData} exercises={exercises} />
    </div>
  )
} 