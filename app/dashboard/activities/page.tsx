import { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { getDashboardData } from "@/lib/api/dashboard"
import { getUserActivities } from "@/lib/api/activities"
import { getCurrentUser } from "@/lib/session"
import { dateRangeParams } from "@/lib/utils"
import { ActivityAddButton } from "@/components/activity/activity-add-button"
import { ActivityList } from "@/components/activity/activity-list"
import { DataTable } from "@/components/data-table"
import { DateRangePicker } from "@/components/date-range-picker"
import { Shell } from "@/components/layout/shell"
import { logColumns } from "@/components/activity/logs/logs-columns"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { StreakOverview } from "@/components/pages/dashboard/streak-overview"
import { QuickActions } from "@/components/pages/dashboard/quick-actions"

export const metadata: Metadata = {
  title: "Activities",
  description: "Manage account activities.",
}

interface ActivitiesPageProps {
  searchParams: { from?: string; to?: string; new?: string }
}

export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/signin")
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  const activities = await getUserActivities(user.id)
  const dateRange = dateRangeParams({
    from: searchParams.from || "",
    to: searchParams.to || "",
  })
  const dashboardData = await getDashboardData(user.id, dateRange)
  const shouldAutoOpenCreate = searchParams.new === "1"

  const activityData =
    dashboardData.activityCountByDate.length > 0 &&
    dashboardData.topActivities.length > 0

  return (
    <Shell>
      <DashboardHeader heading="Activities" text="Manage account activities.">
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <DateRangePicker />
          <ActivityAddButton autoOpen={shouldAutoOpenCreate} />
        </div>
      </DashboardHeader>
      
      <div className="space-y-6">
        <StreakOverview logs={dashboardData.logs} streak={dashboardData.streak} />
        
        <QuickActions />
        
        <div className="divide-y divide-border rounded-md border">
          <ActivityList activities={activities} />
        </div>

        <DataTable columns={logColumns} data={dashboardData.logs}>
          Log History
        </DataTable>
      </div>
    </Shell>
  )
}
