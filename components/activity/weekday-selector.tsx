"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Calendar } from "lucide-react"

interface WeekdaySelectorProps {
  value?: number[]
  onChange?: (days: number[]) => void
  className?: string
}

const WEEKDAYS = [
  { value: 0, label: "Sunday", shortLabel: "S" },
  { value: 1, label: "Monday", shortLabel: "M" },
  { value: 2, label: "Tuesday", shortLabel: "T" },
  { value: 3, label: "Wednesday", shortLabel: "W" },
  { value: 4, label: "Thursday", shortLabel: "T" },
  { value: 5, label: "Friday", shortLabel: "F" },
  { value: 6, label: "Saturday", shortLabel: "S" },
]

export function WeekdaySelector({ 
  value = [], 
  onChange,
  className 
}: WeekdaySelectorProps) {
  const handleDayToggle = (day: number) => {
    if (!onChange) return
    
    const newDays = value.includes(day)
      ? value.filter(d => d !== day)
      : [...value, day].sort((a, b) => a - b)
    
    onChange(newDays)
  }

  const today = new Date().getDay()

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Label className="text-base">Weekly Schedule</Label>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map(({ value: dayValue, label, shortLabel }) => {
          const isSelected = value.includes(dayValue)
          const isToday = dayValue === today
          
          return (
            <button
              key={dayValue}
              type="button"
              onClick={() => handleDayToggle(dayValue)}
              className={cn(
                "relative aspect-square rounded-md border transition-all duration-200",
                "flex flex-col items-center justify-center text-xs font-medium p-1",
                "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
                  : "bg-card hover:bg-accent hover:text-accent-foreground border-border",
                isToday && !isSelected && "border-primary/50 bg-accent/50"
              )}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${label}`}
              title={label}
            >
              <span className="font-semibold">{shortLabel}</span>
              <span className="text-[10px] mt-0.5 hidden sm:inline opacity-70">
                {label.slice(0, 3)}
              </span>
              {isToday && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full" />
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full"></span>
        Today is highlighted • Click days to schedule this activity
      </p>
    </div>
  )
}