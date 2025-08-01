"use client"

import { Activity, ActivityLog } from "@prisma/client"
import { ActivityCard } from "@/components/activity/activity-card"
import { useState, useEffect } from "react"

interface ActivityListEnhancedProps {
  activities: Activity[]
  logs?: ActivityLog[]
}

export function ActivityListEnhanced({ activities, logs = [] }: ActivityListEnhancedProps) {
  const [activityStats, setActivityStats] = useState<Map<string, {
    lastLogged: Date | null
    todayLogged: boolean
    weeklyCount: number
  }>>(new Map())

  useEffect(() => {
    // Calculate stats for each activity
    const stats = new Map()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    activities.forEach(activity => {
      const activityLogs = logs.filter(log => log.activityId === activity.id)
      
      // Find last logged date
      const lastLog = activityLogs.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
      
      // Check if logged today
      const todayLogged = activityLogs.some(log => {
        const logDate = new Date(log.date)
        logDate.setHours(0, 0, 0, 0)
        return logDate.getTime() === today.getTime()
      })
      
      // Count weekly logs
      const weeklyCount = activityLogs.filter(log => {
        const logDate = new Date(log.date)
        return logDate >= weekAgo
      }).length

      stats.set(activity.id, {
        lastLogged: lastLog ? new Date(lastLog.date) : null,
        todayLogged,
        weeklyCount
      })
    })

    setActivityStats(stats)
  }, [activities, logs])

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No activities yet
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first activity to start tracking
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {activities.map((activity, index) => {
        const stats = activityStats.get(activity.id) || {
          lastLogged: null,
          todayLogged: false,
          weeklyCount: 0
        }
        
        return (
          <ActivityCard
            key={activity.id}
            activity={activity}
            lastLogged={stats.lastLogged}
            todayLogged={stats.todayLogged}
            weeklyCount={stats.weeklyCount}
            index={index}
          />
        )
      })}
    </div>
  )
}