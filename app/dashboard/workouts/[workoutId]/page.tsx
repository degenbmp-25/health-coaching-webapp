import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"

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

  const workout = await getWorkout(params.workoutId, user.id)

  if (!workout) {
    notFound()
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
