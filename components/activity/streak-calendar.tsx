"use client"

import { useState, useEffect } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isFuture } from "date-fns"
import { Calendar, CalendarIcon, Flame, Trophy, AlertTriangle, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface ActivityLog {
  id: string
  date: Date
  count: number
}

interface StreakData {
  currentStreak: number
  longestStreak: number
}

interface StreakCalendarProps {
  logs: ActivityLog[]
  streak: StreakData
  activityName?: string
  onDateClick?: (date: Date) => void
}

export function StreakCalendar({ logs, streak, activityName = "Activity", onDateClick }: StreakCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Create a map for quick lookup of logged days
  const loggedDays = new Map<string, number>()
  logs.forEach(log => {
    const dateKey = format(log.date, 'yyyy-MM-dd')
    loggedDays.set(dateKey, (loggedDays.get(dateKey) || 0) + log.count)
  })

  // Get the color class based on activity count
  const getDayColorClass = (date: Date, count: number = 0) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const isTracked = loggedDays.has(dateKey)
    
    if (isFuture(date)) return "bg-gray-100 dark:bg-gray-800 text-gray-400"
    if (!isTracked) return "bg-red-100 dark:bg-red-900 text-red-600 border-red-200 dark:border-red-800"
    
    // Tracked days with intensity based on count
    if (count === 0) return "bg-red-100 dark:bg-red-900 text-red-600"
    if (count <= 2) return "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
    if (count <= 5) return "bg-green-300 dark:bg-green-700 text-green-800 dark:text-green-200"
    return "bg-green-500 dark:bg-green-600 text-white"
  }

  const getStreakReward = () => {
    const { currentStreak } = streak
    if (currentStreak >= 30) return { icon: Trophy, message: "Incredible! 30-day streak!", color: "text-yellow-600" }
    if (currentStreak >= 14) return { icon: TrendingUp, message: "Amazing! 2-week streak!", color: "text-orange-600" }
    if (currentStreak >= 7) return { icon: Flame, message: "Great! 1-week streak!", color: "text-red-600" }
    if (currentStreak >= 3) return { icon: Flame, message: "Keep it up! 3-day streak!", color: "text-blue-600" }
    return null
  }

  const isStreakBroken = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const todayKey = format(today, 'yyyy-MM-dd')
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd')
    
    return !loggedDays.has(todayKey) && !loggedDays.has(yesterdayKey) && streak.currentStreak === 0
  }

  const reward = getStreakReward()
  const streakBroken = isStreakBroken()

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  return (
    <div className="space-y-6">
      {/* Streak Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-orange-500" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{streak.currentStreak}</div>
            <p className="text-sm text-muted-foreground">days in a row</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Best Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{streak.longestStreak}</div>
            <p className="text-sm text-muted-foreground">personal record</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {monthDays.filter(day => {
                const dateKey = format(day, 'yyyy-MM-dd')
                return loggedDays.has(dateKey) && !isFuture(day)
              }).length}
            </div>
            <p className="text-sm text-muted-foreground">days tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Streak Rewards/Alerts */}
      {reward && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
          <reward.icon className={cn("h-4 w-4", reward.color)} />
          <AlertDescription className="font-medium">
                         🎉 {reward.message} You&apos;re crushing it!
          </AlertDescription>
        </Alert>
      )}

      {streakBroken && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
                         Your streak is broken! Don&apos;t give up - track an activity today to start building a new streak! 
            <Button size="sm" className="ml-2" onClick={() => onDateClick?.(new Date())}>
              Log Today
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentMonth, 'MMMM yyyy')} - {activityName}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                ←
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                →
              </Button>
            </div>
          </div>
          <CardDescription>
            Track your daily progress. Red days need attention, green days show success!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded"></div>
              <span>Not tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-200 rounded"></div>
              <span>Light activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span>Good activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>High activity</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}

            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }, (_, i) => (
              <div key={i} className="p-2"></div>
            ))}

            {/* Month days */}
            {monthDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const count = loggedDays.get(dateKey) || 0
              const hasLog = loggedDays.has(dateKey)
              
              return (
                <button
                  key={dateKey}
                  onClick={() => onDateClick?.(day)}
                  onMouseEnter={() => setHoveredDate(day)}
                  onMouseLeave={() => setHoveredDate(null)}
                  disabled={isFuture(day)}
                  className={cn(
                    "relative p-2 text-sm rounded-md border transition-all duration-200 hover:scale-105",
                    "disabled:cursor-not-allowed disabled:hover:scale-100",
                    getDayColorClass(day, count),
                    isToday(day) && "ring-2 ring-blue-500 ring-offset-1",
                    hoveredDate && isSameDay(hoveredDate, day) && "scale-105 shadow-lg"
                  )}
                >
                  <div className="font-medium">{format(day, 'd')}</div>
                  {hasLog && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full border border-current opacity-80"></div>
                  )}
                  {count > 0 && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs font-bold">
                      {count}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Hover tooltip */}
          {hoveredDate && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="font-medium">{format(hoveredDate, 'EEEE, MMMM d, yyyy')}</div>
              <div className="text-sm text-muted-foreground">
                {loggedDays.has(format(hoveredDate, 'yyyy-MM-dd')) 
                  ? `${loggedDays.get(format(hoveredDate, 'yyyy-MM-dd'))} activities logged`
                  : 'No activities logged'
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 