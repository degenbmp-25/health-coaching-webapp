"use client"

import * as React from "react"
import { format, startOfToday } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function MealDatePicker() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = startOfToday()

  // Get date from URL or use today
  const currentDate = searchParams.get('date') 
    ? new Date(searchParams.get('date')!) 
    : today

  function onDateSelect(date: Date | undefined) {
    if (!date) return

    // Create new URLSearchParams object with current params
    const params = new URLSearchParams(searchParams.toString())
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      // If selecting today, remove date from URL
      params.delete('date')
    } else {
      // Otherwise, set the date in URL
      params.set('date', format(date, 'yyyy-MM-dd'))
    }

    // Update URL with new params
    router.push(`/dashboard/meals${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[240px] justify-start text-left font-normal",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(currentDate, "EEEE, MMMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={currentDate}
            onSelect={onDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {format(currentDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd') && (
        <Button 
          variant="outline"
          onClick={() => onDateSelect(today)}
        >
          Today
        </Button>
      )}
    </div>
  )
} 