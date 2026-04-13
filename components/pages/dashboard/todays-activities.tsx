"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Activity, ActivityLog } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Icons } from "@/components/icons"
import { CalendarDays, CheckCircle2, Circle, Plus, Target } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface ActivityWithLogs extends Activity {
  todayLogs: ActivityLog[]
}

interface TodaysActivitiesProps {
  userId: string
  activities: Activity[]
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function TodaysActivities({ userId, activities }: TodaysActivitiesProps) {
  const [todaysActivities, setTodaysActivities] = useState<ActivityWithLogs[]>([])
  const [completedToday, setCompletedToday] = useState<{ [key: string]: number }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loggingActivity, setLoggingActivity] = useState<string | null>(null)
  const router = useRouter()
  
  const today = new Date()
  const todayWeekday = today.getDay() // 0 = Sunday, 6 = Saturday
  const todayName = WEEKDAY_NAMES[todayWeekday]
  
  useEffect(() => {
    fetchTodaysActivitiesAndLogs()
  }, [activities])
  
  const fetchTodaysActivitiesAndLogs = async () => {
    try {
      // Filter activities scheduled for today
      const scheduledForToday = activities.filter(activity => 
        activity.scheduledDays && activity.scheduledDays.includes(todayWeekday)
      )
      
      // Fetch today's logs for these activities
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      
      const activitiesWithLogs = await Promise.all(
        scheduledForToday.map(async (activity) => {
          try {
            const response = await fetch(`/api/activities/${activity.id}/logs?date=${todayStart.toISOString()}`)
            if (response.ok) {
              const logs = await response.json()
              const todayLogs = logs.filter((log: ActivityLog) => {
                const logDate = new Date(log.date)
                return logDate >= todayStart
              })
              
              // Calculate total count for today
              const totalCount = todayLogs.reduce((sum: number, log: ActivityLog) => sum + log.count, 0)
              setCompletedToday(prev => ({ ...prev, [activity.id]: totalCount }))
              
              return { ...activity, todayLogs }
            }
          } catch (error) {
            console.error(`Error fetching logs for activity ${activity.id}:`, error)
          }
          return { ...activity, todayLogs: [] }
        })
      )
      
      setTodaysActivities(activitiesWithLogs)
    } catch (error) {
      console.error("Error fetching today's activities:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleQuickLog = async (activityId: string) => {
    setLoggingActivity(activityId)
    
    const dateToday = new Date()
    dateToday.setHours(0, 0, 0, 0)
    
    try {
      const response = await fetch(`/api/activities/${activityId}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: dateToday,
          count: 1,
        }),
      })
      
      if (!response?.ok) {
        toast({
          title: "Something went wrong.",
          description: "Your activity was not logged. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          description: "Activity logged successfully!",
        })
        
        // Update local state
        setCompletedToday(prev => ({
          ...prev,
          [activityId]: (prev[activityId] || 0) + 1
        }))
        
        // Refresh data
        fetchTodaysActivitiesAndLogs()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log activity",
        variant: "destructive",
      })
    } finally {
      setLoggingActivity(null)
      router.refresh()
    }
  }
  
  const getProgressPercentage = (activity: Activity) => {
    if (!activity.targetCount) return 0
    const completed = completedToday[activity.id] || 0
    return Math.min((completed / activity.targetCount) * 100, 100)
  }
  
  const isActivityComplete = (activity: Activity) => {
    if (!activity.targetCount) return completedToday[activity.id] > 0
    return completedToday[activity.id] >= activity.targetCount
  }
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Today&apos;s Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading activities...</div>
        </CardContent>
      </Card>
    )
  }
  
  const allScheduledActivities = activities.filter(a => a.scheduledDays && a.scheduledDays.length > 0)
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">Today&apos;s Schedule</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{todayName}</p>
          </div>
          {allScheduledActivities.length > 0 && (
            <Link href="/dashboard/activities">
              <Button size="sm" variant="outline" className="text-xs">
                Manage
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {todaysActivities.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              {allScheduledActivities.length === 0 
                ? "No activities have been scheduled yet"
                : "No activities scheduled for today"
              }
            </p>
            <Link href="/dashboard/activities?new=1">
              <Button size="sm" variant="outline">
                {allScheduledActivities.length === 0 
                  ? "Schedule Activities"
                  : "View All Activities"
                }
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysActivities.map((activity) => {
              const progress = getProgressPercentage(activity)
              const isComplete = isActivityComplete(activity)
              const completed = completedToday[activity.id] || 0
              
              return (
                <div 
                  key={activity.id} 
                  className={cn(
                    "group relative p-4 rounded-lg border transition-all duration-200",
                    isComplete 
                      ? "bg-primary/5 border-primary/20"
                      : "bg-card hover:bg-accent/50 border-border"
                  )}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => handleQuickLog(activity.id)}
                        disabled={loggingActivity === activity.id}
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all",
                          isComplete 
                            ? "bg-primary border-primary" 
                            : "border-muted-foreground/50 hover:border-primary"
                        )}
                      >
                        {loggingActivity === activity.id ? (
                          <Icons.spinner className="h-3 w-3 animate-spin text-primary-foreground" />
                        ) : isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: activity.colorCode }}
                      />
                      
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "font-medium truncate",
                          isComplete ? "text-primary" : "text-foreground"
                        )}>
                          {activity.name}
                        </p>
                        {activity.targetCount && (
                          <div className="flex items-center gap-4 mt-2">
                            <Progress value={progress} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {completed}/{activity.targetCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleQuickLog(activity.id)}
                      disabled={loggingActivity === activity.id}
                      size="sm"
                      variant="ghost"
                      className="hidden shrink-0 transition-opacity sm:inline-flex sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Log
                    </Button>
                  </div>
                </div>
              )
            })}
            
            {todaysActivities.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="min-w-0 break-words text-sm text-muted-foreground">
                      Progress: {todaysActivities.filter(a => isActivityComplete(a)).length}/{todaysActivities.length} activities
                    </span>
                  </div>
                  {todaysActivities.every(a => isActivityComplete(a)) && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0">
                      All Complete
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
