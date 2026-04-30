import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"


import { WorkoutEditForm } from "@/components/workout/workout-edit-form"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { db } from "@/lib/db"
import { getExercises } from "@/lib/api/workouts"

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

  // Check if user has coach access via OrganizationMember or User.role
  const coachMembership = await db.organizationMember.findFirst({
    where: { userId: user.id, role: { in: ["owner", "trainer", "coach"] } }
  })
  if (!coachMembership && user.role !== "coach") {
    redirect("/dashboard")
  }

  // URL params.studentId MUST be Clerk ID (external), not database CUID
  // The lookup below uses clerkId to find the student
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

  const exercises = await getExercises(user.id)

  // Get user's organization membership and videos (for video selector)
  let organizationVideos: any[] = []
  let isTrainer = false

  if (coachMembership || user.role === 'coach') {
    isTrainer = true
    organizationVideos = coachMembership
      ? await db.organizationVideo.findMany({
          where: {
            organizationId: coachMembership.organizationId,
            status: 'ready'
          },
          orderBy: { createdAt: 'desc' }
        })
      : []
  }

  // Transform workout data for the form (include organizationVideoId)
  const workoutData = {
    id: workout.id,
    name: workout.name,
    description: workout.description,
    weekNumber: workout.weekNumber,
    dayOfWeek: workout.dayOfWeek,
    exercises: workout.exercises.map(we => ({
      id: we.exerciseId,
      name: we.exercise.name,
      sets: we.sets,
      reps: we.reps,
      weight: we.weight,
      notes: we.notes,
      order: we.order,
      organizationVideoId: we.organizationVideoId,
      muxPlaybackId: we.muxPlaybackId,
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
          videos={organizationVideos}
          isTrainer={isTrainer}
        />
      </div>
    </Shell>
  )
}
