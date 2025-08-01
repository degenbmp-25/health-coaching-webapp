"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  strokeWidth?: number
  strokeColor?: string
  fillColor?: string
  className?: string
  animated?: boolean
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  strokeWidth = 2,
  strokeColor = "currentColor",
  fillColor,
  className,
  animated = true
}: SparklineProps) {
  if (!data || data.length === 0) return null

  // Calculate points for the sparkline
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(" ")

  const fillPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      {fillColor && (
        <defs>
          <linearGradient id="sparklineFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.05} />
          </linearGradient>
        </defs>
      )}
      
      {/* Fill area */}
      {fillColor && (
        <motion.polygon
          points={fillPoints}
          fill="url(#sparklineFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      
      {/* Line */}
      <motion.polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: animated ? 1 : 0, ease: "easeInOut" }}
      />
      
      {/* Dot on last point */}
      <motion.circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r={strokeWidth * 1.5}
        fill={strokeColor}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: animated ? 0.8 : 0 }}
      />
    </svg>
  )
}