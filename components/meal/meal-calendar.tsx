"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DayPicker } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface MealCalendarProps {
  meals: {
    id: string
    name: string
    calories: number
    date: Date
    imageUrl?: string | null
  }[]
}

export function MealCalendar({ meals }: MealCalendarProps) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<Date>()

  return (
    <Card className="p-4">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={(date) => {
          setSelected(date)
          if (date) {
            router.push(`/dashboard/meals?date=${format(date, 'yyyy-MM-dd')}`)
          }
        }}
        showOutsideDays={false}
        className="w-full"
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4 w-full",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "grid grid-cols-7",
          head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
          row: "grid grid-cols-7 mt-2",
          cell: "text-center text-sm relative p-0 rounded-md focus-within:relative focus-within:z-20 flex items-center justify-center",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside: "text-muted-foreground opacity-50",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
      />
    </Card>
  )
} 