"use client"

import Link from "next/link"
import { Activity } from "@prisma/client"
import { motion } from "framer-motion"
import { formatDate, cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ActivityOperations } from "@/components/activity/activity-operations"
import { QuickLogButton } from "@/components/activity/logs/quick-log-button"
import { CheckCircle2, Circle, Calendar, BarChart3 } from "lucide-react"
import { useState, useEffect } from "react"

interface ActivityCardProps {
  activity: Pick<
    Activity,
    "id" | "name" | "description" | "colorCode" | "createdAt"
  >
  lastLogged?: Date | null
  todayLogged?: boolean
  weeklyCount?: number
  index?: number
}

export function ActivityCard({ 
  activity, 
  lastLogged,
  todayLogged = false,
  weeklyCount = 0,
  index = 0 
}: ActivityCardProps) {
  const [isLogged, setIsLogged] = useState(todayLogged)
  const [isHovered, setIsHovered] = useState(false)

  // Create a lighter version of the color for background
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const rgb = hexToRgb(activity.colorCode)
  const bgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` : 'rgba(0,0,0,0.05)'
  const borderColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : 'rgba(0,0,0,0.1)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card 
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          "hover:shadow-lg dark:hover:shadow-2xl",
          isLogged && "ring-2 ring-offset-2"
        )}
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
          '--activity-color': activity.colorCode,
          ringColor: isLogged ? activity.colorCode : undefined
        } as React.CSSProperties}
      >
        {/* Gradient overlay on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          animate={{ opacity: isHovered ? 0.05 : 0 }}
          style={{
            background: `linear-gradient(135deg, ${activity.colorCode}22, transparent)`
          }}
        />

        {/* Color indicator strip */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: activity.colorCode }}
        />

        <div className="p-6 pl-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {/* Header with name and status */}
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ scale: isLogged ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {isLogged ? (
                    <CheckCircle2 
                      className="h-6 w-6 mt-0.5" 
                      style={{ color: activity.colorCode }}
                    />
                  ) : (
                    <Circle 
                      className="h-6 w-6 mt-0.5 text-muted-foreground"
                    />
                  )}
                </motion.div>
                
                <div className="flex-1">
                  <Link
                    href={`/dashboard/activities/${activity.id}`}
                    className="inline-block"
                  >
                    <h3 className="font-semibold text-lg hover:underline">
                      {activity.name}
                    </h3>
                  </Link>
                  
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {lastLogged 
                      ? `Last: ${formatDate(lastLogged.toDateString())}` 
                      : "Not logged yet"
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>{weeklyCount} this week</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <QuickLogButton
                  activityId={activity.id}
                  className={cn(
                    "h-10 w-10 rounded-lg transition-all duration-200",
                    "hover:shadow-md"
                  )}
                  style={{
                    backgroundColor: activity.colorCode,
                    color: 'white'
                  }}
                  variant="ghost"
                  size="icon"
                  onLogSuccess={() => setIsLogged(true)}
                />
              </motion.div>
              
              <ActivityOperations
                activity={{ id: activity.id }}
              />
            </div>
          </div>

          {/* Progress bar for weekly goal (assuming 7 days) */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Weekly Progress</span>
              <span>{weeklyCount}/7</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: activity.colorCode }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((weeklyCount / 7) * 100, 100)}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}