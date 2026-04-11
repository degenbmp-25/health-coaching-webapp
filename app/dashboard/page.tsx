import { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/session"
import { getDashboardData } from "@/lib/api/dashboard"
import { getUserActivities } from "@/lib/api/activities"

import { dateRangeParams } from "@/lib/utils"
import { logColumns } from "@/components/activity/logs/logs-columns"
import { LineChartComponent } from "@/components/charts/linechart"
import { PieChartComponent } from "@/components/charts/piechart"
import { DataTable } from "@/components/data-table"
import { DateRangePicker } from "@/components/date-range-picker"
import { Shell } from "@/components/layout/shell"
import { DashboardCardsEnhanced } from "@/components/pages/dashboard/dashboard-cards-enhanced"
import { DashboardHeader } from "@/components/pages/dashboard/dashboard-header"
import { WelcomeCard } from "@/components/pages/dashboard/welcome-card"
import { StreakOverview } from "@/components/pages/dashboard/streak-overview"
import { HabitLoggingPanel } from "@/components/pages/dashboard/habit-logging-panel"
import { QuickActions } from "@/components/pages/dashboard/quick-actions"
import { TodaysActivities } from "@/components/pages/dashboard/todays-activities"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Monitor your progress.",
}

export const dynamic = "force-dynamic"

interface DashboardProps {
  searchParams: { from?: string; to?: string }
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect("/signin")
  }

  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/signin")
  }

  const dateRange = dateRangeParams({
    from: searchParams.from || "",
    to: searchParams.to || "",
  })
  const dashboardData = await getDashboardData(user.id, dateRange)
  const activities = await getUserActivities(user.id)

  const activityData =
    dashboardData.activityCountByDate.length > 0 &&
    dashboardData.topActivities.length > 0

  const normalizedSearchParams = {
    from: searchParams.from || "",
    to: searchParams.to || "",
  }

  return (
    <Shell className="pt-20 md:pt-0">
      <DashboardHeader heading="Dashboard" text="Monitor your progress.">
        <div className="hidden sm:block">
          <DateRangePicker />
        </div>
      </DashboardHeader>
      
      <div className="space-y-4 sm:space-y-6">
        <HabitLoggingPanel userId={userId} activities={activities} />
        
        <div className="block sm:hidden px-4">
          <DateRangePicker />
        </div>
        
        <WelcomeCard userName={user.name || undefined} />
        
        <TodaysActivities userId={userId} activities={activities} />
        
        <StreakOverview logs={dashboardData.logs} streak={dashboardData.streak} />
        
        <QuickActions />
        
        {/* Stats and Charts Panel */}
        <div className="space-y-6">
          {activityData ? (
            <>
              <DashboardCardsEnhanced data={{
                streak: dashboardData.streak,
                totalLogs: dashboardData.totalLogs,
                mostLoggedActivity: dashboardData.mostLoggedActivity,
                logs: dashboardData.logs
              }} searchParams={normalizedSearchParams} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LineChartComponent data={dashboardData.activityCountByDate} />
                <PieChartComponent data={dashboardData.topActivities} />
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Start tracking activities to see your progress here</p>
            </div>
          )}
        </div>

        <DataTable columns={logColumns} data={dashboardData.logs}>
          Log History
        </DataTable>
      </div>
    </Shell>
  )
}
