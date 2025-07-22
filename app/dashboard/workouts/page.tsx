import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getUserWorkouts } from "@/lib/api/workouts"
import { getCurrentUser } from "@/lib/session"
import { WorkoutAddButton } from "@/components/workout/workout-add-button"
import { WorkoutList } from "@/components/workout/workout-list"
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
      <div className="divide-y divide-border rounded-md border">
        <WorkoutList workouts={workouts} />
      </div>
    </Shell>
  )
} 