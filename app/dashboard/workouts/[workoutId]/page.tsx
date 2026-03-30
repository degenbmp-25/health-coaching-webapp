import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"

import { getWorkout } from "@/lib/api/workouts"

import { WorkoutSessionView } from "@/components/workout/workout-session-view"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Workout Session",
  description: "Track your workout session.",
}

interface WorkoutPageProps {
  params: { workoutId: string }
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  // First, try to get the session - the URL param is actually a SESSION ID when coming from Start Workout
  const session = await db.workoutSession.findFirst({
    where: {
      id: params.workoutId,
      userId: user.id,
    },
    include: {
      workout: {
        include: {
          exercises: {
            include: {
              exercise: true,
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      },
    },
  })

  // If we found a session, use the workout from it
  const workout = session?.workout

  if (!workout) {
    // Fallback: maybe it's an old-style workout ID, try direct fetch
    const directWorkout = await getWorkout(params.workoutId, user.id)
    if (!directWorkout) {
      notFound()
    }
    return (
      <Shell>
        <DashboardHeader
          heading={directWorkout.name}
          text="Track your workout progress."
        >
          <div className="flex gap-2">
            <Link href={`/dashboard/workouts/${directWorkout.id}/edit`}>
              <Button variant="outline" size="sm">
                <Icons.edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Link href="/dashboard/workouts">
              <Button variant="outline" size="sm">
                <Icons.back className="mr-2 h-4 w-4" />
                All Workouts
              </Button>
            </Link>
          </div>
        </DashboardHeader>
        <WorkoutSessionView workout={directWorkout} />
      </Shell>
    )
  }

  return (
    <Shell>
      <DashboardHeader
        heading={workout.name}
        text="Track your workout progress."
      >
        <div className="flex gap-2">
          <Link href={`/dashboard/workouts/${workout.id}/edit`}>
            <Button variant="outline" size="sm">
              <Icons.edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Link href="/dashboard/workouts">
            <Button variant="outline" size="sm">
              <Icons.back className="mr-2 h-4 w-4" />
              All Workouts
            </Button>
          </Link>
        </div>
      </DashboardHeader>
      <WorkoutSessionView workout={workout} />
    </Shell>
  )
}
