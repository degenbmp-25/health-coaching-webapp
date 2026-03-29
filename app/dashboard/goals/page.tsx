import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/session"
import { db } from "@/lib/db"
import { Shell } from "@/components/layout/shell"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { GoalsList } from "@/components/goals/goals-list"

export const metadata: Metadata = {
  title: "Goals",
  description: "Track and manage your fitness goals.",
}

async function getGoals(userId: string) {
  const goals = await db.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return goals.map(goal => ({
    ...goal,
    targetDate: goal.targetDate?.toISOString() || null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  }))
}

export default async function GoalsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  const goals = await getGoals(user.id)

  return (
    <Shell>
      <DashboardHeader heading="Goals" text="Track and manage your fitness goals">
      </DashboardHeader>
      <GoalsList goals={goals} />
    </Shell>
  )
} 