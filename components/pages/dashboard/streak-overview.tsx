"use client"

import { useState } from "react"
import { format, subDays, isToday, isSameDay } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Flame, Trophy, Calendar, TrendingUp, AlertTriangle, Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface ActivityLog {
  id: string
  date: Date
  count: number
  activity: {
    id: string
    name: string
  }
}

interface StreakData {
  currentStreak: number
  longestStreak: number
}

interface StreakOverviewProps {
  logs: ActivityLog[]
  streak: StreakData
}

export function StreakOverview({ logs, streak }: StreakOverviewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')
  
  // Get recent days for visualization
  const getDaysData = () => {
    const days = selectedPeriod === 'week' ? 7 : 30
    const recentDays = Array.from({ length: days }, (_, i) => {
      const date = subDays(new Date(), days - 1 - i)
      return {
        date,
        logs: logs.filter(log => isSameDay(new Date(log.date), date))
      }
    })
    return recentDays
  }

  const daysData = getDaysData()

  // Calculate streak status
  const getStreakStatus = () => {
    const { currentStreak } = streak
    if (currentStreak >= 30) return { level: 'legendary', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
    if (currentStreak >= 14) return { level: 'amazing', color: 'bg-orange-500', textColor: 'text-orange-700' }
    if (currentStreak >= 7) return { level: 'great', color: 'bg-red-500', textColor: 'text-red-700' }
    if (currentStreak >= 3) return { level: 'good', color: 'bg-blue-500', textColor: 'text-blue-700' }
    if (currentStreak >= 1) return { level: 'started', color: 'bg-green-500', textColor: 'text-green-700' }
    return { level: 'none', color: 'bg-gray-300', textColor: 'text-gray-600' }
  }

  const streakStatus = getStreakStatus()

  // Check if today needs logging
  const needsLogging = () => {
    const today = new Date()
    return !logs.some(log => isToday(new Date(log.date)))
  }

  // Get motivational message
  const getMotivationalMessage = () => {
    const { currentStreak } = streak
    if (needsLogging()) {
      return {
        type: 'warning' as const,
        icon: AlertTriangle,
        message: "Don't break your streak! Log an activity today.",
        action: 'Log Activity'
      }
    }
    
    if (currentStreak >= 7) {
      return {
        type: 'success' as const,
        icon: Trophy,
        message: `Incredible ${currentStreak}-day streak! Keep the momentum going.`,
        action: 'View Activities'
      }
    }
    
    if (currentStreak >= 1) {
      return {
        type: 'info' as const,
        icon: Flame,
        message: `${currentStreak} day${currentStreak > 1 ? 's' : ''} and counting! You're building a great habit.`,
        action: 'Continue Streak'
      }
    }
    
    return {
      type: 'info' as const,
      icon: TrendingUp,
      message: "Start your fitness journey today! Log your first activity.",
      action: 'Get Started'
    }
  }

  const motivation = getMotivationalMessage()

  return (
    <div className="space-y-6">
      {/* Streak Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak.currentStreak}</div>
            <Badge variant="secondary" className={cn("text-xs", streakStatus.textColor)}>
              {streakStatus.level}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-yellow-600" />
              Best Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{streak.longestStreak}</div>
            <p className="text-xs text-muted-foreground">personal record</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-blue-500" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {daysData.filter(day => day.logs.length > 0 && selectedPeriod === 'week').length}
            </div>
            <p className="text-xs text-muted-foreground">days active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-500" />
              Total Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      {/* Motivational Alert */}
      <Alert className={cn(
        motivation.type === 'warning' && "border-red-200 bg-red-50 dark:bg-red-950",
        motivation.type === 'success' && "border-green-200 bg-green-50 dark:bg-green-950", 
        motivation.type === 'info' && "border-blue-200 bg-blue-50 dark:bg-blue-950"
      )}>
        <motivation.icon className={cn(
          "h-4 w-4",
          motivation.type === 'warning' && "text-red-600",
          motivation.type === 'success' && "text-green-600",
          motivation.type === 'info' && "text-blue-600"
        )} />
        <AlertDescription className="flex items-center justify-between">
          <span>{motivation.message}</span>
          <Link href="/dashboard/activities">
            <Button size="sm" variant="outline" className="ml-4">
              {motivation.action}
            </Button>
          </Link>
        </AlertDescription>
      </Alert>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant={selectedPeriod === 'week' ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod('week')}
              >
                Week
              </Button>
              <Button 
                size="sm" 
                variant={selectedPeriod === 'month' ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod('month')}
              >
                Month
              </Button>
            </div>
          </div>
          <CardDescription>
            Your recent activity pattern. Red means no activity, green means you were active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {daysData.map((day, index) => {
              const hasActivity = day.logs.length > 0
              const activityCount = day.logs.reduce((sum, log) => sum + log.count, 0)
              const isCurrentDay = isToday(day.date)
              
              return (
                <div key={index} className="flex flex-col items-center gap-1">
                  <div className="text-xs text-muted-foreground font-medium">
                    {format(day.date, selectedPeriod === 'week' ? 'EEE' : 'd')}
                  </div>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all",
                      isCurrentDay && "ring-2 ring-blue-500 ring-offset-1",
                      hasActivity 
                        ? activityCount >= 5 
                          ? "bg-green-500 text-white border-green-600" 
                          : "bg-green-300 text-green-800 border-green-400"
                        : "bg-red-100 text-red-600 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800"
                    )}
                    title={`${format(day.date, 'MMM d')}: ${hasActivity ? `${activityCount} activities` : 'No activity'}`}
                  >
                    {hasActivity ? activityCount : ''}
                  </div>
                  {selectedPeriod === 'month' && (
                    <div className="text-xs text-muted-foreground">
                      {format(day.date, 'MMM')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>No activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-300 border border-green-400 rounded"></div>
              <span>Some activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 border border-green-600 rounded"></div>
              <span>High activity</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 