"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProgressRingProps {
  progress: number // 0-100
  size?: number
  strokeWidth?: number
  className?: string
  children?: React.ReactNode
  gradientId?: string
  colors?: {
    start: string
    end: string
  }
  animated?: boolean
  showPercentage?: boolean
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  children,
  gradientId = "progressGradient",
  colors = {
    start: "#10b981", // emerald-500
    end: "#34d399"    // emerald-400
  },
  animated = true,
  showPercentage = true
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>
        
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: animated ? 1.5 : 0,
            ease: "easeInOut",
            delay: animated ? 0.2 : 0
          }}
          className="drop-shadow-md"
        />
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        {showPercentage && !children ? (
          <motion.span 
            className="text-2xl font-bold text-gray-900 dark:text-gray-100"
            initial={animated ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: animated ? 0.8 : 0 }}
          >
            {Math.round(progress)}%
          </motion.span>
        ) : (
          children
        )}
      </div>
    </div>
  )
}