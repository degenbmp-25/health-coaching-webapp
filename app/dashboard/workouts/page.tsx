import { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { getUserWorkouts } from "@/lib/api/workouts"
import { getCurrentUser } from "@/lib/session"
import { WorkoutAddButton } from "@/components/workout/workout-add-button"
import { WorkoutList } from "@/components/workout/workout-list"
import { WorkoutListSkeleton } from "@/components/workout/workout-list-skeleton"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"

export const metadata: Metadata = {
  title: "Workouts",
  description: "Manage your workout plans.",
}

export default async function WorkoutsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  const workouts = await getUserWorkouts(user.id)

  return (
    <Shell>
      <DashboardHeader
        heading="Workouts"
        text="Manage your workout plans."
      >
        <WorkoutAddButton />
      </DashboardHeader>
      <Suspense fallback={<WorkoutListSkeleton count={6} />}>
        <WorkoutList workouts={workouts} />
      </Suspense>
    </Shell>
  )
}
