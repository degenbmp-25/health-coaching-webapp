import { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { notFound, redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"

import { getUserActivity } from "@/lib/api/activities"
import { getStatsDashboardData } from "@/lib/api/dashboard"

import { buttonVariants } from "@/components/ui/button"
import { cn, dateRangeParams } from "@/lib/utils"
import { ActivityOperations } from "@/components/activity/activity-operations"
import { Heatmap } from "@/components/charts/heatmap"
import { DataTable } from "@/components/data-table"
import { DateRangePicker } from "@/components/date-range-picker"
import { Shell } from "@/components/layout/shell"
import { logColumns } from "@/components/activity/logs/logs-columns"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { StatsCards } from "@/components/activity/stats/stats-cards"
import { StreakCalendar } from "@/components/activity/streak-calendar"
import { Icons } from "@/components/icons"

export const metadata: Metadata = {
  title: "Activity Stats",
  description: "View activity statistics and history.",
}

interface ActivityPageProps {
  params: {
    activityId: string
  }
  searchParams: { from?: string; to?: string }
}

export default async function ActivityPage({
  params,
  searchParams,
}: ActivityPageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/signin")
  }

  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  const activity = await getUserActivity(params.activityId, user.id)

  if (!activity) {
    notFound()
  }

  const dateRange = dateRangeParams({
    from: searchParams.from || "",
    to: searchParams.to || "",
  })
  const dashboardData = await getStatsDashboardData(activity.id, dateRange)

  const normalizedSearchParams = {
    from: searchParams.from || "",
    to: searchParams.to || "",
  }

  return (
    <Shell>
      <DashboardHeader
        heading={`${activity.name} Stats`}
        text={activity.description}
      >
        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <DateRangePicker />
          <ActivityOperations
            activity={{
              id: activity.id,
            }}
          >
            <div
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              <Icons.down className="mr-2 h-4 w-4" />
              Actions
            </div>
          </ActivityOperations>
        </div>
      </DashboardHeader>
      
      <div className="space-y-6">
        <StreakCalendar 
          logs={dashboardData.logs} 
          streak={dashboardData.streak} 
          activityName={activity.name}
        />
        <Heatmap data={dashboardData.logs} params={params} />
        <StatsCards data={dashboardData} searchParams={normalizedSearchParams} />
        <DataTable columns={logColumns} data={dashboardData.logs}>
          Log History
        </DataTable>
      </div>
    </Shell>
  )
}
