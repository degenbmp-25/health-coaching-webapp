"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ProgressRing } from "./progress-ring"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  progress?: number
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
  gradient?: {
    from: string
    to: string
  }
  className?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  subtitle,
  progress,
  trend,
  icon,
  gradient = {
    from: "from-blue-500",
    to: "to-blue-600"
  },
  className,
  onClick
}: StatCardProps) {
  const hasProgress = progress !== undefined
  const hasTrend = trend !== undefined

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-lg",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Gradient background overlay */}
      <div 
        className={cn(
          "absolute inset-0 opacity-5 dark:opacity-10",
          `bg-gradient-to-br ${gradient.from} ${gradient.to}`
        )} 
      />
      
      {/* Icon or Progress Ring */}
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <motion.p 
              className="text-3xl font-bold tracking-tight"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {value}
            </motion.p>
            {hasTrend && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className={cn(
                  "flex items-center text-sm font-medium",
                  trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : trend.value === 0 ? (
                  <Minus className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </motion.span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        {hasProgress ? (
          <ProgressRing
            progress={progress}
            size={80}
            strokeWidth={6}
            colors={{
              start: gradient.from.replace('from-', '#').replace('-500', ''),
              end: gradient.to.replace('to-', '#').replace('-600', '')
            }}
            showPercentage={false}
          >
            {icon && (
              <motion.div
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-muted-foreground"
              >
                {icon}
              </motion.div>
            )}
          </ProgressRing>
        ) : icon ? (
          <motion.div
            initial={{ opacity: 0, rotate: -180 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn(
              "rounded-lg p-3",
              `bg-gradient-to-br ${gradient.from} ${gradient.to}`,
              "text-white shadow-lg"
            )}
          >
            {icon}
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  )
}