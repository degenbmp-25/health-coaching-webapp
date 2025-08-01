"use client"

import { useState, useEffect } from "react"
import { SearchParams } from "@/types"
import { formatDate } from "@/lib/utils"
import { StatCard } from "@/components/ui/stat-card"
import { Icons } from "@/components/icons"
import { Flame, Target, Activity, TrendingUp } from "lucide-react"

interface DashboardCardsProps {
  data: {
    streak: {
      currentStreak: number
      longestStreak: number
    }
    totalLogs: number
    mostLoggedActivity: string | undefined
    logs: Array<{
      createdAt: string | Date
    }>
  }
  searchParams: SearchParams
}

function displayDateRange(searchParams: SearchParams) {
  return searchParams.from && searchParams.to
    ? `${formatDate(new Date(searchParams.from).toISOString())} - ${formatDate(new Date(searchParams.to).toISOString())}`
    : "Last year"
}

function calculateTrend(currentValue: number, previousValue: number): { value: number; isPositive: boolean } {
  if (previousValue === 0) return { value: 0, isPositive: true }
  const percentChange = ((currentValue - previousValue) / previousValue) * 100
  return {
    value: Math.round(Math.abs(percentChange)),
    isPositive: percentChange >= 0
  }
}

export function DashboardCardsEnhanced({ data, searchParams }: DashboardCardsProps) {
  const [previousWeekLogs, setPreviousWeekLogs] = useState(0)
  
  // Calculate weekly logs
  const thisWeekLogs = data.logs.filter(log => {
    const logDate = new Date(log.createdAt)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return logDate >= weekAgo
  }).length

  // Calculate streak progress (assuming a goal of 30 days)
  const streakGoal = 30
  const streakProgress = Math.min((data.streak.currentStreak / streakGoal) * 100, 100)

  // Calculate best streak progress
  const bestStreakProgress = data.streak.longestStreak > 0 
    ? (data.streak.currentStreak / data.streak.longestStreak) * 100 
    : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Current Streak"
        value={`${data.streak.currentStreak} days`}
        subtitle={`Goal: ${streakGoal} days`}
        progress={streakProgress}
        icon={<Flame className="h-5 w-5" />}
        gradient={{
          from: "from-orange-500",
          to: "to-red-600"
        }}
        trend={
          data.streak.currentStreak > 0
            ? { value: 100, isPositive: true }
            : { value: 0, isPositive: false }
        }
      />
      
      <StatCard
        title="Best Streak"
        value={`${data.streak.longestStreak} days`}
        subtitle="All time record"
        progress={bestStreakProgress}
        icon={<Target className="h-5 w-5" />}
        gradient={{
          from: "from-purple-500",
          to: "to-pink-600"
        }}
      />
      
      <StatCard
        title="Weekly Activity"
        value={thisWeekLogs}
        subtitle="Activities logged"
        progress={(thisWeekLogs / 7) * 100} // Assuming goal of 1 activity per day
        icon={<Activity className="h-5 w-5" />}
        gradient={{
          from: "from-blue-500",
          to: "to-cyan-600"
        }}
        trend={calculateTrend(thisWeekLogs, previousWeekLogs || thisWeekLogs)}
      />
      
      <StatCard
        title="Top Activity"
        value={data.mostLoggedActivity || "None yet"}
        subtitle={displayDateRange(searchParams)}
        icon={<TrendingUp className="h-5 w-5" />}
        gradient={{
          from: "from-green-500",
          to: "to-emerald-600"
        }}
      />
    </div>
  )
}