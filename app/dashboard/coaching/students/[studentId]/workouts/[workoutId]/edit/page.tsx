import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"


import { WorkoutEditForm } from "@/components/workout/workout-edit-form"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { db } from "@/lib/db"

export const metadata: Metadata = {
  title: "Edit Student Workout",
  description: "Edit your student's workout plan.",
}

interface StudentWorkoutEditPageProps {
  params: { studentId: string; workoutId: string }
}

export default async function StudentWorkoutEditPage({ params }: StudentWorkoutEditPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  // Get fresh user data from database to ensure we have the latest role
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true }
  })

  // Verify user is a coach using fresh database data
  if (dbUser?.role !== "coach") {
    redirect("/dashboard")
  }

  // Get the student by Clerk ID and verify coach relationship
  const student = await db.user.findFirst({
    where: {
      clerkId: params.studentId,
      coachId: user.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  if (!student) {
    notFound()
  }

  // Get the workout belonging to this student using their database ID
  const workout = await db.workout.findFirst({
    where: {
      id: params.workoutId,
      userId: student.id,
    },
    include: {
      exercises: {
        include: {
          exercise: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  })

  if (!workout) {
    notFound()
  }

  // Fetch all exercises
  const exercises = await db.exercise.findMany({
    orderBy: {
      name: 'asc',
    },
  })

  // Transform workout data for the form
  const workoutData = {
    id: workout.id,
    name: workout.name,
    description: workout.description,
    exercises: workout.exercises.map(we => ({
      id: we.exerciseId,
      name: we.exercise.name,
      sets: we.sets,
      reps: we.reps,
      weight: we.weight,
      notes: we.notes,
      order: we.order,
    })),
  }

  return (
    <Shell>
      <DashboardHeader
        heading={`Edit "${workout.name}"`}
        text={`Editing workout for ${student.name}`}
      />
      <div className="grid gap-6">
        <WorkoutEditForm
          workout={workoutData}
          exercises={exercises}
          redirectUrl="/dashboard/coaching"
        />
      </div>
    </Shell>
  )
} 